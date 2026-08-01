import { FormulaResolver } from '@helpers/formulae/FormulaResolver.mjs';
import type { FamiliarSchema, FieldAspect } from '@helpers/formulae/types.mjs';
import { renderFormulaHTML } from '@helpers/formulae/utils.mjs';
import { describe, expect, it } from 'vitest';

const { parseFormula, validateFormula } = FormulaResolver;

/**
 * `$contains(`/`$find(`/`$any(`/`$count(`/`$stringContains(` keyword
 * highlighting (poc §7.2b follow-up) — mirrors `$conditional`'s existing
 * treatment (`render-formula-html-conditional-keyword.test.mts`):
 *
 * - purple (no modifier) — the block parses cleanly.
 * - yellow (`is-warning`) while focused, escalating to red (`is-error`) once
 *   blurred — `unbalancedParens`/`missingProjection` (still typing).
 * - red (`is-error`) always, regardless of focus — `argCount` (genuinely
 *   malformed, not "still typing").
 *
 * A bare `$` or any partial/unrecognized `$word` with no `(` yet (still
 * typing the keyword itself) always renders yellow while focused, red once
 * blurred — the same still-typing treatment as a bare/partial `#context`
 * token — so the user never sees an unstyled, uncolored `$` while typing.
 */
describe('renderFormulaHTML — $contains/$find/$any/$count/$stringContains keyword highlighting', () => {
  const schema: FamiliarSchema = {
    self: {
      properties: {
        tags: { type: 'array', accessPath: 'system.tags' } as FieldAspect,
      },
    },
  };

  function render(formula: string, isFocused = true): string {
    return renderFormulaHTML(formula, parseFormula(formula), validateFormula(formula, schema), schema, isFocused);
  }

  function keywordSpans(html: string, text: string): string[] {
    return html.match(new RegExp(`<span class="formula-keyword[^"]*"[^>]*>${text}</span>`, 'gi')) ?? [];
  }

  describe('well-formed $contains(...) — plain purple, no state modifier', () => {
    const formula = '$contains(#self.tags, "fire")';

    it('has no state modifier while focused', () => {
      const spans = keywordSpans(render(formula, true), '\\$contains');
      expect(spans).toHaveLength(1);
      expect(spans[0]).not.toMatch(/is-warning|is-error/);
    });

    it('has no state modifier once blurred', () => {
      const spans = keywordSpans(render(formula, false), '\\$contains');
      expect(spans).toHaveLength(1);
      expect(spans[0]).not.toMatch(/is-warning|is-error/);
    });
  });

  describe('unbalancedParens — still typing (yellow while focused, red once blurred)', () => {
    const formula = '$contains(#self.tags, "fire"';

    it('yellow while focused', () => {
      const spans = keywordSpans(render(formula, true), '\\$contains');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-warning');
    });

    it('red once blurred, with the specific error as a tooltip', () => {
      const spans = keywordSpans(render(formula, false), '\\$contains');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-error');
      expect(spans[0]).toContain('dnd35e.Formula.Errors.function.unbalancedParens');
    });
  });

  describe('missingProjection ($find only) — still typing (yellow while focused, red once blurred)', () => {
    const formula = '$find(#self.tags, #it == "fire")';

    it('yellow while focused', () => {
      const spans = keywordSpans(render(formula, true), '\\$find');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-warning');
    });

    it('red once blurred, with the specific error as a tooltip', () => {
      const spans = keywordSpans(render(formula, false), '\\$find');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-error');
      expect(spans[0]).toContain('dnd35e.Formula.Errors.function.missingProjection');
    });
  });

  describe('argCount — genuinely malformed, always red regardless of focus', () => {
    const formula = '$contains(#self.tags)';

    it('red while focused', () => {
      const spans = keywordSpans(render(formula, true), '\\$contains');
      expect(spans[0]).toContain('is-error');
      expect(spans[0]).not.toContain('is-warning');
    });

    it('red once blurred', () => {
      const spans = keywordSpans(render(formula, false), '\\$contains');
      expect(spans[0]).toContain('is-error');
    });
  });

  describe('still-typing $ (bare or partial keyword, no "(" yet) — same treatment as a partial #context', () => {
    it('a bare "$" is yellow while focused', () => {
      const spans = keywordSpans(render('$', true), '\\$');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-warning');
    });

    it('a bare "$" is red once blurred', () => {
      const spans = keywordSpans(render('$', false), '\\$');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-error');
    });

    it('a partial keyword ("$con") is yellow while focused', () => {
      const spans = keywordSpans(render('$con', true), '\\$con');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-warning');
    });

    it('a complete keyword with no "(" yet ("$contains") is still yellow while focused', () => {
      const spans = keywordSpans(render('$contains', true), '\\$contains');
      expect(spans).toHaveLength(1);
      expect(spans[0]).toContain('is-warning');
    });
  });

  /**
   * A backslash-escaped `\$contains(` is not a real block opener to
   * `FormulaResolver.functionGrammar.mts` (`FUNCTION_OPEN_REGEX` has a
   * `(?<!\\)` guard) — the editor highlighter must not wrap it in a
   * `.formula-keyword` span either.
   */
  it('does not highlight an escaped "\\$contains(" as a formula-keyword span', () => {
    const formula = '\\$contains(#self.tags, "fire")';
    const html = render(formula);
    expect(html).not.toMatch(/<span class="formula-keyword[^"]*"[^>]*>\$contains<\/span>/);
  });
});
