import { FormulaResolver } from '@helpers/formulae/FormulaResolver.mjs';
import type { FamiliarSchema, FieldAspect } from '@helpers/formulae/types.mjs';
import { renderFormulaHTML } from '@helpers/formulae/utils.mjs';
import { describe, expect, it } from 'vitest';

const { parseFormula, validateFormula } = FormulaResolver;

/**
 * Comparison (`<`, `>`, `>=`, `<=`, `==`, `!=`) and logical (`&&`, `||`)
 * operator highlighting — poc §7.7b operator-highlighting work, extending the
 * `!`/paren conventions to binary operators.
 *
 * - blue (no modifier) — both operand slots are present/complete (a number,
 *   a bareword IDENT, a closed quoted string, `true`/`false`, a resolvable
 *   `#variable`, or a matched `(...)` group).
 * - yellow (`is-warning`) — the trailing (right) operand is still being
 *   typed: formula ends right after the operator, or an unclosed quote.
 *   There is no yellow state on the left — a missing left operand is always
 *   red (the user has already typed past that point).
 * - red (`is-error`) — an operand slot is missing/broken and definitively
 *   terminated (e.g. a `)` immediately closes the group right after the
 *   operator, leaving nothing between them).
 *
 * `&&`/`||` use the exact same left/right classification — their "operand"
 * is typically a parenthesized group, whose matched/unmatched paren state
 * cascades into the logical operator's own color.
 */
describe('renderFormulaHTML — comparison/logical operator highlighting', () => {
  const schema: FamiliarSchema = {
    self: {
      properties: {
        name: { type: 'string', accessPath: 'name' } as FieldAspect,
        Level: { type: 'number', accessPath: 'system.level' } as FieldAspect,
      },
    },
    owner: {
      properties: {
        strength: {
          mod: { type: 'number', accessPath: 'system.abilities.str.mod' } as FieldAspect,
        },
      },
    },
  };

  function render(formula: string): string {
    return renderFormulaHTML(formula, parseFormula(formula), validateFormula(formula, schema), schema);
  }

  /** `symbol` is the raw operator text (e.g. '<', '&&') -- escaped once to match the rendered HTML. */
  function operatorSpans(html: string, symbol: string): string[] {
    const escaped = symbol.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
    return html.match(new RegExp(`<span class="formula-operator[^"]*"[^>]*>${escaped}</span>`, 'g')) ?? [];
  }

  describe('yellow — right operand still being typed', () => {
    it('"0 <" — nothing after the operator', () => {
      const spans = operatorSpans(render('0 <'), '<');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-warning');
    });

    it('\'#self.name == "words\' — unclosed quoted string', () => {
      const spans = operatorSpans(render('#self.name == "words'), '==');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-warning');
    });
  });

  describe('red — operand slot missing and definitively closed', () => {
    it('"(#self.Level >)" — the group closes immediately after the operator', () => {
      const spans = operatorSpans(render('(#self.Level >)'), '>');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-error');
    });
  });

  describe('blue — both operands present and valid', () => {
    it('"0 < #self.Level"', () => {
      const spans = operatorSpans(render('0 < #self.Level'), '<');
      expect(spans).toHaveLength(1);
      expect(spans[0]).not.toMatch(/is-warning|is-error/);
    });

    it('\'#self.name == "words"\'', () => {
      const spans = operatorSpans(render('#self.name == "words"'), '==');
      expect(spans).toHaveLength(1);
      expect(spans[0]).not.toMatch(/is-warning|is-error/);
    });
  });

  describe('missing left operand — always red, never yellow', () => {
    it('"> 5" — formula starts with the operator', () => {
      const spans = operatorSpans(render('> 5'), '>');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-error');
    });

    it('"(> 5)" — nothing between the opening paren and the operator', () => {
      const spans = operatorSpans(render('(> 5)'), '>');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-error');
    });
  });

  describe('&&/|| — mixed: complete group blue, still-typing group + join yellow', () => {
    it('"(#self.Level > 1) && (#owner.strength.mod >" — first group blue, join + trailing yellow', () => {
      const html = render('(#self.Level > 1) && (#owner.strength.mod >');

      const firstGt = operatorSpans(html, '>')[0];
      expect(firstGt).not.toMatch(/is-warning|is-error/);

      const andSpan = operatorSpans(html, '&&')[0];
      expect(andSpan).toContain('is-warning');

      const secondGt = operatorSpans(html, '>')[1];
      expect(secondGt).toContain('is-warning');
    });

    it('"(#self.Level > 1) || (#owner.strength.mod > 2)" — both groups complete, all blue', () => {
      const html = render('(#self.Level > 1) || (#owner.strength.mod > 2)');
      const orSpan = operatorSpans(html, '||')[0];
      expect(orSpan).not.toMatch(/is-warning|is-error/);
      for (const span of operatorSpans(html, '>')) {
        expect(span).not.toMatch(/is-warning|is-error/);
      }
    });
  });

  describe('bareword/number operands are valid for comparisons (unlike "!")', () => {
    it('"Longsword != Dagger" — bareword IDENT on both sides', () => {
      const spans = operatorSpans(render('Longsword != Dagger'), '!=');
      expect(spans).toHaveLength(1);
      expect(spans[0]).not.toMatch(/is-warning|is-error/);
    });

    it('">= and <= render valid when both sides are numbers', () => {
      expect(operatorSpans(render('3 >= 2'), '>=')[0]).not.toMatch(/is-warning|is-error/);
      expect(operatorSpans(render('3 <= 2'), '<=')[0]).not.toMatch(/is-warning|is-error/);
    });
  });
});

describe('renderFormulaHTML — focus-based severity escalation (isFocused param)', () => {
  const schema: FamiliarSchema = {
    self: { properties: { Level: { type: 'number', accessPath: 'system.level' } as FieldAspect } },
  };

  function render(formula: string, isFocused: boolean): string {
    return renderFormulaHTML(formula, parseFormula(formula), validateFormula(formula, schema), schema, isFocused);
  }

  it('a still-typing right operand is yellow while focused, red once blurred', () => {
    const focused = render('0 <', true);
    const blurred = render('0 <', false);
    expect(focused).toContain('is-warning');
    expect(blurred).not.toContain('is-warning');
    expect(blurred).toContain('is-error');
  });

  it('an unmatched paren is yellow while focused, red once blurred', () => {
    const focused = render('(#self.Level > 1', true);
    const blurred = render('(#self.Level > 1', false);
    expect(focused).toContain('formula-paren is-warning');
    expect(blurred).toContain('formula-paren is-error');
  });

  it('"!" targeting a still-typing bare reference is yellow while focused, red once blurred', () => {
    const focused = render('!#self.', true);
    const blurred = render('!#self.', false);
    expect(focused).toContain('formula-operator is-warning');
    expect(blurred).toContain('formula-operator is-error');
  });

  it('isFocused defaults to true when omitted (existing callers unaffected)', () => {
    const html = renderFormulaHTML('0 <', parseFormula('0 <'), validateFormula('0 <', schema), schema);
    expect(html).toContain('is-warning');
  });
});
