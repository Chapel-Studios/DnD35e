import { FormulaResolver } from '@helpers/formulae/FormulaResolver.mjs';
import type { FamiliarSchema, FieldAspect } from '@helpers/formulae/types.mjs';
import { renderFormulaHTML } from '@helpers/formulae/utils.mjs';
import { describe, expect, it } from 'vitest';

const { extractVariables, parseFormula, validateFormula } = FormulaResolver;

/**
 * `!` (logical NOT) operator highlighting — added alongside §7.7b's
 * operator-highlighting work. `renderFormulaHTML()` wraps each `!` in a
 * `formula-operator` span:
 *
 * - blue (no modifier)  — targets a valid operand: a complete/valid
 *   `#context.property` token, a matched `(...)` group, or `true`/`false`.
 * - yellow (`is-warning`) — nothing typed yet after `!`, or the operand is
 *   still being typed (bare context reference, unclosed quote, unmatched
 *   paren).
 * - red (`is-error`) — targets plain text/a number, not a meaningful boolean
 *   operand.
 */
describe('renderFormulaHTML — "!" operator highlighting', () => {
  const schema: FamiliarSchema = {
    self: {
      properties: {
        name: { type: 'string', accessPath: 'name' } as FieldAspect,
        Level: { type: 'number', accessPath: 'system.level' } as FieldAspect,
      },
    },
    target: {
      properties: {
        isFlanked: { type: 'boolean', accessPath: 'flags.isFlanked' } as FieldAspect,
      },
    },
  };

  function render(formula: string): string {
    return renderFormulaHTML(formula, parseFormula(formula), validateFormula(formula, schema), schema);
  }

  function bangSpans(html: string): string[] {
    return html.match(/<span class="formula-operator[^"]*"[^>]*>!<\/span>/g) ?? [];
  }

  describe('yellow — still typing', () => {
    it('a bare "!" with nothing after it', () => {
      const spans = bangSpans(render('!'));
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-warning');
    });

    it('"!#self." — mid-typing a property path (bare context reference so far)', () => {
      const spans = bangSpans(render('!#self.'));
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-warning');
    });
  });

  describe('red — targets plain text or a number', () => {
    it('"!text"', () => {
      const spans = bangSpans(render('!text'));
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-error');
    });

    it('"!9"', () => {
      const spans = bangSpans(render('!9'));
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-error');
    });
  });

  describe('blue — targets a valid operand', () => {
    it('"!#self.name" — a valid, resolvable variable', () => {
      const spans = bangSpans(render('!#self.name'));
      expect(spans).toHaveLength(1);
      expect(spans[0]).not.toContain('is-warning');
      expect(spans[0]).not.toContain('is-error');
    });

    it('"!#target.isFlanked" — a valid, resolvable variable', () => {
      const spans = bangSpans(render('!#target.isFlanked'));
      expect(spans).toHaveLength(1);
      expect(spans[0]).not.toContain('is-warning');
      expect(spans[0]).not.toContain('is-error');
    });

    it('"!(#self.Level > 0)" — a matched paren group', () => {
      const spans = bangSpans(render('!(#self.Level > 0)'));
      expect(spans).toHaveLength(1);
      expect(spans[0]).not.toContain('is-warning');
      expect(spans[0]).not.toContain('is-error');
    });

    it('"!true" / "!false" — literal boolean keywords', () => {
      expect(bangSpans(render('!true'))[0]).not.toMatch(/is-warning|is-error/);
      expect(bangSpans(render('!false'))[0]).not.toMatch(/is-warning|is-error/);
    });
  });

  describe('edge cases', () => {
    it('an unmatched (still-typing) paren after "!" is yellow, not blue', () => {
      const spans = bangSpans(render('!(#self.Level > 0'));
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-warning');
    });

    it('an invalid property path after "!" is red', () => {
      const spans = bangSpans(render('!#self.bogusPath'));
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-error');
    });

    it('chained "!!" reads through to the ultimate operand', () => {
      const spans = bangSpans(render('!!#self.name'));
      expect(spans).toHaveLength(2);
      expect(spans.every(span => !span.includes('is-warning') && !span.includes('is-error'))).toBe(true);
    });
  });
});

// Sanity check that extractVariables/validateFormula still behave normally
// alongside the new "!" highlighting (it doesn't touch variable parsing).
describe('"!" highlighting does not affect variable extraction', () => {
  it('extracts #self.name unaffected by a preceding "!"', () => {
    const variables = extractVariables('!#self.name');
    expect(variables).toHaveLength(1);
    expect(variables[0].variable).toBe('#self.name');
  });
});
