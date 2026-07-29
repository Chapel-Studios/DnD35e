import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import { FormulaResolver } from '@helpers/formulae/FormulaResolver.mjs';
import type { FamiliarSchema, FieldAspect } from '@helpers/formulae/types.mjs';
import { describe, expect, it } from 'vitest';

const {
  findConditionalBlocks,
  resolveConditionalFormula,
  resolveFormula,
  validateFormula,
} = FormulaResolver;

/**
 * Story C (redesigned) — `$conditional(when(cond, value) ... else(default))`
 * flat rule-list conditional syntax. See
 * `docs/migration-plan/poc/phase-07-roll-formulas.md` §7.10 "Compiled Syntax".
 */
describe('findConditionalBlocks — parsing', () => {
  it('parses a single when() + else()', () => {
    const blocks = findConditionalBlocks('$conditional(when(1 > 0, 5) else(2))');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].error).toBeUndefined();
    expect(blocks[0].whenClauses).toEqual([{ condition: '1 > 0', value: '5' }]);
    expect(blocks[0].elseValue).toBe('2');
  });

  it('parses multiple when() clauses in left-to-right order', () => {
    const blocks = findConditionalBlocks('$conditional(when(a, 1) when(b, 2) when(c, 3) else(4))');
    expect(blocks[0].whenClauses).toEqual([
      { condition: 'a', value: '1' },
      { condition: 'b', value: '2' },
      { condition: 'c', value: '3' },
    ]);
    expect(blocks[0].elseValue).toBe('4');
  });

  it('allows else() to appear anywhere among the clauses', () => {
    const blocks = findConditionalBlocks('$conditional(else(4) when(a, 1) when(b, 2))');
    expect(blocks[0].error).toBeUndefined();
    expect(blocks[0].elseValue).toBe('4');
    expect(blocks[0].whenClauses).toEqual([
      { condition: 'a', value: '1' },
      { condition: 'b', value: '2' },
    ]);
  });

  it('treats the clause separator as dont-care (comma, space, or nothing)', () => {
    const commaSeparated = findConditionalBlocks('$conditional(when(a, 1), when(b, 2), else(3))');
    const spaceSeparated = findConditionalBlocks('$conditional(when(a, 1) when(b, 2) else(3))');
    const noSeparator = findConditionalBlocks('$conditional(when(a, 1)when(b, 2)else(3))');
    expect(commaSeparated[0].whenClauses).toEqual(spaceSeparated[0].whenClauses);
    expect(spaceSeparated[0].whenClauses).toEqual(noSeparator[0].whenClauses);
    expect(noSeparator[0].elseValue).toBe('3');
  });

  it('is case-insensitive and tolerant of whitespace before (', () => {
    const blocks = findConditionalBlocks('$CONDITIONAL ( WHEN ( a , 1 ) ELSE ( 2 ) )');
    expect(blocks[0].error).toBeUndefined();
    expect(blocks[0].whenClauses).toEqual([{ condition: 'a', value: '1' }]);
    expect(blocks[0].elseValue).toBe('2');
  });

  it('handles a value containing a nested $conditional(...) via balanced-paren scanning', () => {
    const blocks = findConditionalBlocks(
      '$conditional(when(a, $conditional(when(x, 1) else(2))) else(3))'
    );
    expect(blocks[0].error).toBeUndefined();
    expect(blocks[0].whenClauses).toEqual([
      { condition: 'a', value: '$conditional(when(x, 1) else(2))' },
    ]);
    expect(blocks[0].elseValue).toBe('3');
  });

  it('finds multiple independent $conditional(...) blocks in one formula', () => {
    const blocks = findConditionalBlocks(
      '$conditional(when(a, 1) else(2))+$conditional(when(b, 3) else(4))'
    );
    expect(blocks).toHaveLength(2);
    expect(blocks[0].elseValue).toBe('2');
    expect(blocks[1].elseValue).toBe('4');
  });

  it('flags a missing else() as an error', () => {
    const blocks = findConditionalBlocks('$conditional(when(a, 1))');
    expect(blocks[0].error).toBe('missingElse');
  });

  it('flags more than one else() as an error', () => {
    const blocks = findConditionalBlocks('$conditional(when(a, 1) else(2) else(3))');
    expect(blocks[0].error).toBe('multipleElse');
  });

  it('flags a when() with the wrong argument count as an error', () => {
    const blocks = findConditionalBlocks('$conditional(when(a) else(2))');
    expect(blocks[0].error).toBe('whenArgCount');
  });

  it('flags an else() with the wrong argument count as an error', () => {
    const blocks = findConditionalBlocks('$conditional(when(a, 1) else(2, 3))');
    expect(blocks[0].error).toBe('elseArgCount');
  });

  it('flags unbalanced parens as an error', () => {
    const blocks = findConditionalBlocks('$conditional(when(a, 1) else(2)');
    expect(blocks[0].error).toBe('unbalancedParens');
  });
});

describe('resolveConditionalFormula — resolution', () => {
  // A trivial sub-resolver/evaluator pair for unit-testing the resolver in isolation
  // from the full FamiliarSchema/documentDataMap machinery.
  const identityResolve = (text: string): string => text;
  const literalEvaluate = (resolvedCondition: string): boolean => resolvedCondition.trim() === 'true';

  it('returns the formula unchanged when there are no $conditional(...) blocks', () => {
    expect(resolveConditionalFormula('2d6+3', identityResolve, literalEvaluate)).toBe('2d6+3');
  });

  it('picks the first true when() clause', () => {
    const result = resolveConditionalFormula(
      '$conditional(when(false, 1) when(true, 2) else(3))',
      identityResolve,
      literalEvaluate
    );
    expect(result).toBe('2');
  });

  it('falls back to else() when no when() clause matches', () => {
    const result = resolveConditionalFormula(
      '$conditional(when(false, 1) when(false, 2) else(3))',
      identityResolve,
      literalEvaluate
    );
    expect(result).toBe('3');
  });

  it('preserves surrounding literal text around the block', () => {
    const result = resolveConditionalFormula(
      '$conditional(when(true, 0) else(2))d6',
      identityResolve,
      literalEvaluate
    );
    expect(result).toBe('0d6');
  });

  it('recursively resolves a nested $conditional(...) within the winning branch', () => {
    const result = resolveConditionalFormula(
      '$conditional(when(true, $conditional(when(true, 1) else(2))) else(3))',
      identityResolve,
      literalEvaluate
    );
    expect(result).toBe('1');
  });

  it('leaves a malformed block raw/unresolved rather than guessing', () => {
    const formula = '$conditional(when(true, 1))';
    expect(resolveConditionalFormula(formula, identityResolve, literalEvaluate)).toBe(formula);
  });

  it('treats a condition evaluation throw as false (falls through to the next clause)', () => {
    const throwingEvaluate = (): boolean => {
      throw new Error('boom');
    };
    const result = resolveConditionalFormula(
      '$conditional(when(anything, 1) else(2))',
      identityResolve,
      throwingEvaluate
    );
    expect(result).toBe('2');
  });
});

describe('resolveFormula — end-to-end with $conditional(...)', () => {
  const schema: FamiliarSchema = {
    self: {
      properties: {
        hp: { value: { type: 'number', accessPath: 'system.hp.value' } as FieldAspect },
        isFlanked: { type: 'boolean', accessPath: 'system.isFlanked' } as FieldAspect,
        sneakAttackDice: { type: 'string', accessPath: 'system.sneakAttackDice' } as FieldAspect,
      },
    },
  };

  it('resolves the doc example — HP <= 0 branch wins', () => {
    const docMap = { self: { system: { hp: { value: 0 }, isFlanked: false, sneakAttackDice: '1d6' } } };
    const resolved = resolveFormula(
      '$conditional(when(#self.hp.value <= 0, 0) when(#self.isFlanked, 1d6+#self.sneakAttackDice) else(2d6))',
      schema,
      docMap as never
    );
    expect(resolved).toBe('0');
  });

  it('resolves the doc example — flanked branch wins when HP is positive', () => {
    const docMap = { self: { system: { hp: { value: 10 }, isFlanked: true, sneakAttackDice: '1d6' } } };
    const resolved = resolveFormula(
      '$conditional(when(#self.hp.value <= 0, 0) when(#self.isFlanked, 1d6+#self.sneakAttackDice) else(2d6))',
      schema,
      docMap as never
    );
    expect(resolved).toBe('1d6+1d6');
  });

  it('resolves the doc example — else() default wins when no rule matches', () => {
    const docMap = { self: { system: { hp: { value: 10 }, isFlanked: false, sneakAttackDice: '1d6' } } };
    const resolved = resolveFormula(
      '$conditional(when(#self.hp.value <= 0, 0) when(#self.isFlanked, 1d6+#self.sneakAttackDice) else(2d6))',
      schema,
      docMap as never
    );
    expect(resolved).toBe('2d6');
  });

  it('is fully backward compatible — a formula with zero $conditional(...) blocks is untouched', () => {
    const docMap = { self: { system: { hp: { value: 10 }, isFlanked: false, sneakAttackDice: '1d6' } } };
    expect(resolveFormula('2d6+3', schema, docMap as never)).toBe('2d6+3');
  });

  it('resolves through FormulaData.resolveSource (number expectedType) end-to-end', () => {
    const result = FormulaData.resolveSource(
      { formula: '$conditional(when(0 <= 0, 0) else(5))', resolvedValue: null, expectedType: 'number' },
      {}
    );
    expect(result).toBe('0');
  });
});

describe('validateFormula — $conditional(...) syntax', () => {
  const schema: FamiliarSchema = {
    self: {
      properties: {
        hp: { value: { type: 'number', accessPath: 'system.hp.value' } as FieldAspect },
      },
    },
  };

  it('does not flag a well-formed $conditional(...) as an unknown context', () => {
    const errors = validateFormula('$conditional(when(#self.hp.value <= 0, 0) else(2))', schema);
    expect(errors).toHaveLength(0);
  });

  it('still validates nested #context.property tokens inside when()/else()', () => {
    const errors = validateFormula('$conditional(when(#self.bogus.path <= 0, 0) else(2))', schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.severity === 'error')).toBe(true);
  });

  it('surfaces a structural error for a missing else()', () => {
    const errors = validateFormula('$conditional(when(#self.hp.value <= 0, 0))', schema);
    expect(errors.some(e => e.error.length > 0 && e.severity === 'error')).toBe(true);
  });

  it('surfaces a structural error for unbalanced parens', () => {
    const errors = validateFormula('$conditional(when(#self.hp.value <= 0, 0) else(2)', schema);
    expect(errors.some(e => e.severity === 'error')).toBe(true);
  });
});

/**
 * A `#token` immediately followed by more identifier characters with no
 * separator greedily merges into one (invalid) path segment — parens are
 * required to disambiguate. This is a pre-existing `VARIABLE_REGEX` behavior,
 * not specific to `$conditional(...)`, but it's exactly the shape a
 * `when()`/`else()` value tends to take when dice notation trails a token.
 */
describe('token/literal-text adjacency — parens required to disambiguate', () => {
  const schema: FamiliarSchema = {
    self: {
      properties: {
        sneakAttackDice: { type: 'string', accessPath: 'system.sneakAttackDice' } as FieldAspect,
      },
    },
  };

  it('an unparenthesized token immediately followed by literal text is invalid (propertyNotFound)', () => {
    const errors = validateFormula('#self.sneakAttackDiced6', schema);
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('error');
    expect(errors[0].path).toEqual(['sneakAttackDiced6']);
  });

  it('wrapping the token in parens resolves correctly', () => {
    const docMap = { self: { system: { sneakAttackDice: '1d6' } } };
    const resolved = resolveFormula('(#self.sneakAttackDice)d6', schema, docMap as never);
    expect(resolved).toBe('(1d6)d6');
  });

  it('wrapping the token in parens validates with no errors', () => {
    const errors = validateFormula('(#self.sneakAttackDice)d6', schema);
    expect(errors).toHaveLength(0);
  });
});

describe('escaping literal parentheses — \\( and \\)', () => {
  it('findMatchingParen skips an escaped paren when counting depth', () => {
    // The when() value contains a literal, unbalanced "(" that must not be
    // mistaken for the start of a new nesting level.
    const blocks = findConditionalBlocks('$conditional(when(true, "Note: unbalanced \\(") else(2))');
    expect(blocks[0].error).toBeUndefined();
    expect(blocks[0].whenClauses[0].value).toBe('"Note: unbalanced \\("');
  });

  it('an unescaped unbalanced literal paren in a value produces a parse error', () => {
    const blocks = findConditionalBlocks('$conditional(when(true, "Note: unbalanced (") else(2))');
    expect(blocks[0].error).toBe('unbalancedParens');
  });

  it('a balanced pair of literal parens in a value needs no escaping', () => {
    const blocks = findConditionalBlocks('$conditional(when(true, "Longsword (Masterwork)") else("none"))');
    expect(blocks[0].error).toBeUndefined();
    expect(blocks[0].whenClauses[0].value).toBe('"Longsword (Masterwork)"');
  });

  it('resolveFormula unescapes \\( and \\) back to literal parens in the final output', () => {
    const schema: FamiliarSchema = { self: { properties: {} } };
    const resolved = resolveFormula('$conditional(when(true, \\(escaped\\)) else(2))', schema, {} as never);
    expect(resolved).toBe('(escaped)');
  });

  it('escaping the paren right after "when"/"else" prevents it from being parsed as a clause', () => {
    // "when\(" is literal text, not a clause opener — the whole $conditional(...)
    // is malformed as a result (no recognized when()/else() clauses at all).
    const blocks = findConditionalBlocks('$conditional(when\\(not a clause\\))');
    expect(blocks[0].error).toBe('missingElse');
    expect(blocks[0].whenClauses).toHaveLength(0);
  });

  it('escaping the $ in \\$conditional( prevents the block from being recognized at all', () => {
    const blocks = findConditionalBlocks('\\$conditional(when(true, 1) else(2))');
    expect(blocks).toHaveLength(0);
  });

  it('a keyword-like substring mid-identifier (e.g. "somewhen(") is not misparsed as a clause', () => {
    // "xsomewhen(3)" is stray/ignored text (not a recognized clause, per the
    // lenient "don't care what's between clauses" design) — only else(2) is
    // picked up as a real clause. Without the word-boundary lookbehind, the
    // "when(" substring inside "somewhen(" would be wrongly matched as a
    // when() clause with a single (invalid) argument.
    const blocks = findConditionalBlocks('$conditional(xsomewhen(3) else(2))');
    expect(blocks[0].error).toBeUndefined();
    expect(blocks[0].whenClauses).toHaveLength(0);
    expect(blocks[0].elseValue).toBe('2');
  });
});

describe('escaping a literal comma — \\,', () => {
  it('an escaped comma inside a quoted string value is not mistaken for the arg separator', () => {
    const blocks = findConditionalBlocks('$conditional(when(#self.name == "\\,", 500) else(0))');
    expect(blocks[0].error).toBeUndefined();
    expect(blocks[0].whenClauses).toHaveLength(1);
    expect(blocks[0].whenClauses[0].condition).toBe('#self.name == "\\,"');
    expect(blocks[0].whenClauses[0].value).toBe('500');
  });

  it('resolveFormula unescapes \\, back to a literal comma so the comparison sees ","', () => {
    const schema: FamiliarSchema = {
      self: { properties: { name: { type: 'string', accessPath: 'name' } as FieldAspect } },
    };
    const docMap = { self: { name: ',' } };
    const resolved = resolveFormula(
      '$conditional(when(#self.name == "\\,", 500) else(0))',
      schema,
      docMap as never
    );
    expect(resolved).toBe('500');
  });

  it('without the escape, an unescaped comma in the value would split into an extra (invalid) arg', () => {
    const blocks = findConditionalBlocks('$conditional(when(#self.name == ",", 500) else(0))');
    expect(blocks[0].error).toBe('whenArgCount');
  });
});

