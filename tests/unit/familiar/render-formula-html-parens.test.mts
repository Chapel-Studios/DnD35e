import { FormulaResolver } from '@helpers/formulae/FormulaResolver.mjs';
import { renderFormulaHTML } from '@helpers/formulae/utils.mjs';
import { describe, expect, it } from 'vitest';

const { parseFormula } = FormulaResolver;

/**
 * Paren-pairing highlight (added alongside poc §7.7b's operator-highlighting work).
 * `renderFormulaHTML()` wraps each `(`/`)` in a `formula-paren` span, tagged
 * `is-warning` when unmatched and untagged (blue) when part of a complete pair.
 * Matching is computed over the whole formula string, so it must hold across
 * nesting and across multiple text-token boundaries (variables split the
 * formula into several text tokens).
 */
describe('renderFormulaHTML — parenthesis pairing', () => {
  it('marks a single balanced pair as matched (no is-warning)', () => {
    const formula = '(#self.level)';
    const html = renderFormulaHTML(formula, parseFormula(formula), []);
    const parenSpans = html.match(/<span class="formula-paren[^"]*"/g) ?? [];
    expect(parenSpans).toHaveLength(2);
    expect(parenSpans.every(span => !span.includes('is-warning'))).toBe(true);
  });

  it('marks nested balanced pairs as matched across multiple text-token boundaries', () => {
    const formula = '(#self.level + (#self.AC / 2))';
    const html = renderFormulaHTML(formula, parseFormula(formula), []);
    const parenSpans = html.match(/<span class="formula-paren[^"]*"/g) ?? [];
    expect(parenSpans).toHaveLength(4);
    expect(parenSpans.every(span => !span.includes('is-warning'))).toBe(true);
  });

  it('marks an unmatched opening paren as is-warning (still typing)', () => {
    const formula = '(#self.level + 1';
    const html = renderFormulaHTML(formula, parseFormula(formula), []);
    const parenSpans = html.match(/<span class="formula-paren[^"]*"/g) ?? [];
    expect(parenSpans).toHaveLength(1);
    expect(parenSpans[0]).toContain('is-warning');
  });

  it('marks an unmatched closing paren as is-warning', () => {
    const formula = '#self.level)';
    const html = renderFormulaHTML(formula, parseFormula(formula), []);
    const parenSpans = html.match(/<span class="formula-paren[^"]*"/g) ?? [];
    expect(parenSpans).toHaveLength(1);
    expect(parenSpans[0]).toContain('is-warning');
  });

  it('mixed: innermost pair matched, extra outer opening paren unmatched', () => {
    const formula = '((#self.level)';
    const html = renderFormulaHTML(formula, parseFormula(formula), []);
    const parenSpans = html.match(/<span class="formula-paren[^"]*"/g) ?? [];
    // Stack-based matching: the second "(" pairs with the ")", leaving the
    // first (outermost) "(" unmatched.
    expect(parenSpans).toHaveLength(3);
    expect(parenSpans.filter(span => span.includes('is-warning'))).toHaveLength(1);
    expect(parenSpans.filter(span => !span.includes('is-warning'))).toHaveLength(2);
  });

  /**
   * Backslash-escaped parens (`\(`/`\)`) are literal text to the real
   * `$conditional(...)` grammar (FormulaResolver.conditionalGrammar.mts's
   * `findMatchingParen` skips them entirely) — the editor highlighter must
   * not wrap them in a `.formula-paren` span, and they must not consume a
   * slot on the paren-matching stack (so they can't falsely "absorb" or
   * "orphan" a real, unescaped paren elsewhere in the formula).
   */
  it('does not highlight a backslash-escaped paren as a formula-paren span', () => {
    const formula = '\\(literal\\)';
    const html = renderFormulaHTML(formula, parseFormula(formula), []);
    const parenSpans = html.match(/<span class="formula-paren[^"]*"/g) ?? [];
    expect(parenSpans).toHaveLength(0);
    expect(html).toContain('\\(literal\\)');
  });

  it('an escaped paren does not throw off matching of real parens elsewhere in the formula', () => {
    const formula = '(#self.level) \\(literal\\)';
    const html = renderFormulaHTML(formula, parseFormula(formula), []);
    const parenSpans = html.match(/<span class="formula-paren[^"]*"/g) ?? [];
    // Only the real, unescaped pair gets wrapped — and it's matched.
    expect(parenSpans).toHaveLength(2);
    expect(parenSpans.every(span => !span.includes('is-warning'))).toBe(true);
  });

  it('a real unmatched paren after an escaped paren is still flagged as unmatched', () => {
    const formula = '\\(literal) #self.level';
    const html = renderFormulaHTML(formula, parseFormula(formula), []);
    const parenSpans = html.match(/<span class="formula-paren[^"]*"/g) ?? [];
    // The escaped "\(" is inert; the real ")" has nothing on the stack to
    // pair with, so it's unmatched.
    expect(parenSpans).toHaveLength(1);
    expect(parenSpans[0]).toContain('is-warning');
  });
});
