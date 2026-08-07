import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import { FormulaResolver } from '@helpers/formulae/FormulaResolver.mjs';
import type { FamiliarSchema,FieldAspect } from '@helpers/formulae/types.mjs';
import type { Mock } from 'vitest';
import { describe, expect, it } from 'vitest';

const { evaluateBooleanExpression, resolveFormula, validateFormulaType } = FormulaResolver;

/**
 * Story A (poc §7.2a) — boolean formula resolution + type-mismatch validation.
 *
 * `FormulaData.resolveSource()` is exercised with an empty documentDataMap so no
 * FormulaFamiliar schema registration is required — these tests use formulas
 * with no `#context.property` tokens (pure literal expressions), which is
 * sufficient to prove `_finalizeResolvedValue()`'s new 'boolean' branch.
 */
describe('FormulaData — boolean expectedType resolution', () => {
  it('resolves a comparison expression to the string "true"', () => {
    const result = FormulaData.resolveSource(
      { formula: '6 > 5', resolvedValue: null, expectedType: 'boolean' },
      {}
    );
    expect(result).toBe('true');
  });

  it('resolves a comparison expression to the string "false" on the other side of the threshold', () => {
    const result = FormulaData.resolveSource(
      { formula: '4 > 5', resolvedValue: null, expectedType: 'boolean' },
      {}
    );
    expect(result).toBe('false');
  });

  it('evaluates compound expressions (&&, ||, !, parentheses)', () => {
    expect(FormulaData.resolveSource({ formula: '(3 > 2) && (1 == 1)', resolvedValue: null, expectedType: 'boolean' }, {})).toBe('true');
    expect(FormulaData.resolveSource({ formula: '3 > 2 || false', resolvedValue: null, expectedType: 'boolean' }, {})).toBe('true');
    expect(FormulaData.resolveSource({ formula: '!(3 > 2) && true', resolvedValue: null, expectedType: 'boolean' }, {})).toBe('false');
  });

  it('does not throw on an invalid boolean expression — falls back to the raw resolved text', () => {
    expect(() => FormulaData.resolveSource(
      { formula: '5 >', resolvedValue: null, expectedType: 'boolean' },
      {}
    )).not.toThrow();
    const result = FormulaData.resolveSource(
      { formula: '5 >', resolvedValue: null, expectedType: 'boolean' },
      {}
    );
    expect(result).toBe('5 >');
  });
});

describe('FormulaData — number expectedType, Roll.safeEval this-binding regression', () => {
  it('resolves a parenthesized numeric formula without throwing (Roll.safeEval called bound to `Roll`)', () => {
    // Uses the DEFAULT (un-overridden) tests/setup.mts Roll.safeEval stub, which throws if
    // called detached from `Roll` (e.g. `const fn = Roll.safeEval; fn(x)`) — the real Foundry
    // implementation depends on `this.MATH_PROXY` and breaks silently in that case. A
    // regression here would cause `_finalizeResolvedValue` to catch the throw and fall back
    // to the raw, unresolved formula text instead of a numeric string.
    const result = FormulaData.resolveSource(
      { formula: '(6 + 2)', resolvedValue: null, expectedType: 'number' },
      {}
    );
    expect(result).not.toBe('(6 + 2)');
    expect(Number.isNaN(Number(result))).toBe(false);
  });
});

describe('resolveFormula + evaluateBooleanExpression — the doc example end-to-end', () => {
  const schema: FamiliarSchema = {
    self: {
      properties: {
        skill: {
          concentration: {
            ranks: { type: 'number', accessPath: 'system.skill.concentration.ranks' } as FieldAspect,
          },
        },
      },
    },
  };

  it('"#self.skill.concentration.ranks > 5" resolves true above the threshold', () => {
    const docMap = { self: { system: { skill: { concentration: { ranks: 6 } } } } };
    const resolved = resolveFormula('#self.skill.concentration.ranks > 5', schema, docMap as never);
    expect(resolved).toBe('6 > 5');
    expect(evaluateBooleanExpression(resolved)).toBe(true);
  });

  it('"#self.skill.concentration.ranks > 5" resolves false below the threshold', () => {
    const docMap = { self: { system: { skill: { concentration: { ranks: 3 } } } } };
    const resolved = resolveFormula('#self.skill.concentration.ranks > 5', schema, docMap as never);
    expect(resolved).toBe('3 > 5');
    expect(evaluateBooleanExpression(resolved)).toBe(false);
  });
});

describe('validateFormulaType — expectedType mismatch surfaces a validation error', () => {
  it('flags a number-typed field whose formula resolves to boolean text', () => {
    // The test-harness Roll.safeEval stub (tests/setup.mts) returns 0 for any
    // non-numeric input rather than throwing/NaN like Foundry's real dice-formula
    // parser does on non-arithmetic text — override it here, for this call only,
    // to match real behavior.
    (globalThis.Roll.safeEval as Mock).mockImplementationOnce(() => {
      throw new Error('not a valid dice formula');
    });

    const schema: FamiliarSchema = {
      self: { properties: { flag: { type: 'boolean', accessPath: 'system.flag', value: 'true' } } },
    };
    const error = validateFormulaType('#self.flag', schema, 'number');
    expect(error).not.toBeNull();
    expect(error?.severity).toBe('error');
  });

  it('passes a number-typed field whose formula resolves to a number', () => {
    const schema: FamiliarSchema = {
      self: { properties: { hp: { type: 'number', accessPath: 'system.hp', value: 10 } } },
    };
    expect(validateFormulaType('#self.hp + 5', schema, 'number')).toBeNull();
  });

  it('passes a parenthesized number-typed formula (Roll.safeEval this-binding regression)', () => {
    // Regression for the exact user-reported bug: `(#self.level)`-style parenthesized
    // numeric formulas failing to resolve because a detached `Roll.safeEval` reference
    // lost its `this` binding. The default tests/setup.mts stub now throws on wrong
    // binding, so this test fails loudly if that regresses.
    const schema: FamiliarSchema = {
      self: { properties: { hp: { type: 'number', accessPath: 'system.hp', value: 10 } } },
    };
    expect(validateFormulaType('(#self.hp + 5)', schema, 'number')).toBeNull();
  });

  it('passes a boolean-typed field whose formula is a valid comparison', () => {
    const schema: FamiliarSchema = {
      self: { properties: { ranks: { type: 'number', accessPath: 'system.ranks', value: 6 } } },
    };
    expect(validateFormulaType('#self.ranks > 5', schema, 'boolean')).toBeNull();
  });

  it('flags a boolean-typed field whose formula is not a valid boolean expression', () => {
    const schema: FamiliarSchema = {
      self: { properties: { ranks: { type: 'number', accessPath: 'system.ranks', value: 6 } } },
    };
    const error = validateFormulaType('#self.ranks >', schema, 'boolean');
    expect(error).not.toBeNull();
    expect(error?.severity).toBe('error');
  });

  it('does not flag string-typed fields (no type coercion possible)', () => {
    const schema: FamiliarSchema = {
      self: { properties: { name: { type: 'string', accessPath: 'system.name', value: 'Longsword' } } },
    };
    expect(validateFormulaType('#self.name', schema, 'string')).toBeNull();
  });

  describe('without a live/cached FieldAspect value (no live parent document)', () => {
    it('still flags a syntax error — two adjacent expressions with no operator', () => {
      // No `.value` on `broken` — this is the shape of a merged fallback schema
      // (e.g. an orphaned/standalone effect with no live parent to resolve real
      // values from). The bug: this used to bail out silently instead of
      // catching the missing operator between `!#self.broken` and `0`.
      const schema: FamiliarSchema = {
        self: { properties: { broken: { type: 'boolean', accessPath: 'system.broken' } } },
      };
      const error = validateFormulaType('!#self.broken 0', schema, 'boolean');
      expect(error).not.toBeNull();
      expect(error?.severity).toBe('error');
    });

    it('does not false-positive on a valid comparison', () => {
      const schema: FamiliarSchema = {
        self: { properties: { ranks: { type: 'number', accessPath: 'system.ranks' } } },
      };
      expect(validateFormulaType('#self.ranks > 5', schema, 'boolean')).toBeNull();
    });

    it('unresolvable variables (no matching aspect at all) still skip validation', () => {
      const schema: FamiliarSchema = { self: { properties: {} } };
      expect(validateFormulaType('!#self.missing 0', schema, 'boolean')).toBeNull();
    });
  });

  describe('unescaped $ in the resolved text — always skips validation (poc §7.2b)', () => {
    // `resolveFormulaFromSchemaValues` only substitutes `#context.property` —
    // it has no `$conditional`/`$contains`/`$find`/`$any`/`$count`/
    // `$stringContains` awareness (that needs a live document). Any unescaped
    // `$` left over — whether still-typing (`$`, `$c`) or a fully-valid,
    // complete function call — means the type can't be determined here, so
    // validation must bail out instead of forcing a false type-mismatch error.
    const schema: FamiliarSchema = {
      self: { properties: { tags: { type: 'array', accessPath: 'system.tags' } } },
    };

    it('a bare "$" mid-typing does not produce a number-type error', () => {
      expect(validateFormulaType('$', schema, 'number')).toBeNull();
    });

    it('a partial function keyword mid-typing does not produce a number-type error', () => {
      expect(validateFormulaType('$con', schema, 'number')).toBeNull();
    });

    it('a partial function keyword mid-typing does not produce a boolean-type error', () => {
      expect(validateFormulaType('$contains(', schema, 'boolean')).toBeNull();
    });

    it('a complete, well-formed $contains(...) call does not produce a boolean-type error', () => {
      expect(validateFormulaType('$contains(#self.tags, "fire")', schema, 'boolean')).toBeNull();
    });

    it('a complete $conditional(...) call does not produce a number-type error', () => {
      expect(validateFormulaType('$conditional(when(#self.tags, 1) else(0))', schema, 'number')).toBeNull();
    });

    it('an escaped "\\$" is still coerced normally (not treated as live $-grammar)', () => {
      // No unescaped $ remains once resolved — falls through to real coercion.
      // Override the test-harness Roll.safeEval stub (see the earlier test in
      // this file) so this non-numeric literal text throws instead of the
      // stub's default non-throwing fallback.
      (globalThis.Roll.safeEval as Mock).mockImplementationOnce(() => {
        throw new Error('not a valid dice formula');
      });
      const error = validateFormulaType('\\$5', schema, 'number');
      expect(error).not.toBeNull();
      expect(error?.severity).toBe('error');
    });
  });
});
