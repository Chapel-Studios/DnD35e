import { FormulaResolver } from '@helpers/formulae/FormulaResolver.mjs';
import type { FamiliarSchema, FieldAspect } from '@helpers/formulae/types.mjs';
import { renderFormulaHTML } from '@helpers/formulae/utils.mjs';
import { describe, expect, it } from 'vitest';

const { parseFormula, validateFormula } = FormulaResolver;

/**
 * `$conditional(...)` / `when(`/`else(` keyword highlighting — a distinct
 * "keyword" color (purple, `.formula-keyword`) since these are structural
 * syntax, not real `#context.property` data references.
 *
 * - `$conditional` itself tracks the block's own well-formedness:
 *   - purple (no modifier) — the block parses cleanly.
 *   - yellow (`is-warning`) while focused, escalating to red (`is-error`)
 *     once blurred — `unbalancedParens`/`missingElse` (still typing).
 *   - red (`is-error`) always, regardless of focus — `multipleElse`/
 *     `whenArgCount`/`elseArgCount` (genuinely malformed, not "still typing").
 *   - the malformed-case tooltip carries the specific localized error.
 * - `when(`/`else(` keyword literals are always plain purple — their own
 *   well-formedness isn't separately tracked, only `$conditional`'s is.
 * - Nested `#context.property` tokens and comparison operators inside
 *   when()/else() clauses are untouched — still highlighted normally.
 */
describe('renderFormulaHTML — $conditional/when/else keyword highlighting', () => {
  const schema: FamiliarSchema = {
    self: {
      properties: {
        hp: { value: { type: 'number', accessPath: 'system.hp.value' } as FieldAspect },
      },
    },
  };

  function render(formula: string, isFocused = true): string {
    return renderFormulaHTML(formula, parseFormula(formula), validateFormula(formula, schema), schema, isFocused);
  }

  function keywordSpans(html: string, text: string): string[] {
    return html.match(new RegExp(`<span class="formula-keyword[^"]*"[^>]*>${text}</span>`, 'gi')) ?? [];
  }

  describe('well-formed block — $conditional/when/else all plain purple', () => {
    const formula = '$conditional(when(#self.hp.value <= 0, 0) else(2))';

    it('"$conditional" has no state modifier', () => {
      const spans = keywordSpans(render(formula), '\\$conditional');
      expect(spans).toHaveLength(1);
      expect(spans[0]).not.toMatch(/is-warning|is-error/);
    });

    it('"when" and "else" have no state modifier', () => {
      const html = render(formula);
      expect(keywordSpans(html, 'when')[0]).not.toMatch(/is-warning|is-error/);
      expect(keywordSpans(html, 'else')[0]).not.toMatch(/is-warning|is-error/);
    });

    it('nested #self.hp.value and <= still highlight normally', () => {
      const html = render(formula);
      expect(html).toContain('class="formula-variable"');
      expect(html).toMatch(/<span class="formula-operator[^"]*"[^>]*>&lt;=<\/span>/);
    });
  });

  describe('missingElse — still typing (yellow while focused, red once blurred)', () => {
    const formula = '$conditional(when(#self.hp.value <= 0, 0))';

    it('yellow while focused', () => {
      const spans = keywordSpans(render(formula, true), '\\$conditional');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-warning');
    });

    it('red once blurred, with the specific error as a tooltip', () => {
      const spans = keywordSpans(render(formula, false), '\\$conditional');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-error');
      expect(spans[0]).toContain('dnd35e.Formula.Errors.conditional.missingElse');
    });
  });

  describe('unbalancedParens — still typing (yellow while focused, red once blurred)', () => {
    const formula = '$conditional(when(#self.hp.value <= 0, 0)';

    it('yellow while focused', () => {
      const spans = keywordSpans(render(formula, true), '\\$conditional');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-warning');
    });

    it('red once blurred, with the specific error as a tooltip', () => {
      const spans = keywordSpans(render(formula, false), '\\$conditional');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-error');
      expect(spans[0]).toContain('dnd35e.Formula.Errors.conditional.unbalancedParens');
    });
  });

  describe('multipleElse — genuinely malformed, always red regardless of focus', () => {
    const formula = '$conditional(when(#self.hp.value <= 0, 0) else(1) else(2))';

    it('red while focused', () => {
      const spans = keywordSpans(render(formula, true), '\\$conditional');
      expect(spans[0]).toContain('is-error');
      expect(spans[0]).not.toContain('is-warning');
    });

    it('red once blurred', () => {
      const spans = keywordSpans(render(formula, false), '\\$conditional');
      expect(spans[0]).toContain('is-error');
    });
  });

  describe('whenArgCount — genuinely malformed, always red regardless of focus', () => {
    const formula = '$conditional(when(#self.hp.value <= 0) else(2))';

    it('red while focused', () => {
      const spans = keywordSpans(render(formula, true), '\\$conditional');
      expect(spans[0]).toContain('is-error');
      expect(spans[0]).not.toContain('is-warning');
    });
  });

  /**
   * A backslash-escaped `\$conditional(` is not a real block opener to
   * `FormulaResolver.conditionalGrammar.mts` (`CONDITIONAL_OPEN_REGEX` has a
   * `(?<!\\)` guard) — the editor highlighter must not wrap it in a
   * `.formula-keyword` span either, or it would visually promise structure
   * the parser will never honor.
   */
  it('does not highlight an escaped "\\$conditional(" as a formula-keyword span', () => {
    const formula = '\\$conditional(when(#self.hp.value <= 0, 0) else(2))';
    const html = render(formula);
    // "$conditional" itself is inert literal text — no keyword span.
    expect(html).not.toMatch(/<span class="formula-keyword[^"]*"[^>]*>\$conditional<\/span>/);
    // The "(" right after it is an ordinary, unescaped grouping paren (not
    // part of any "$conditional(" keyword token), so it's still highlighted
    // and matched normally — same as any other real paren in the formula.
    expect(html).toContain('\\$conditional<span class="formula-paren"');
  });

  /**
   * A stray paren sitting outside every recognized block (e.g. a leftover
   * "(" typed before an otherwise well-formed "$conditional(...)") isn't
   * caught by `findConditionalBlocks`/`findFunctionBlocks` at all — only the
   * generic whole-formula paren-balance check in `validateFormula` catches
   * it. The rendered paren span must carry that error as a tooltip, not just
   * a bare red highlight with no explanation.
   */
  it('an unmatched stray paren outside any keyword block gets a tooltip from the generic unbalanced-parens error', () => {
    const formula = '($conditional(when(1, 5) else(3))';
    const html = render(formula, false);
    expect(html).toMatch(/<span class="formula-paren is-error" title="[^"]*"[^>]*>\(<\/span>/);
  });
});
