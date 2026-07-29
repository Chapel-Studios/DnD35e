import { FormulaResolver } from '@helpers/formulae/FormulaResolver.mjs';
import { renderFormulaHTML } from '@helpers/formulae/utils.mjs';
import { describe, expect, it } from 'vitest';

const { parseFormula } = FormulaResolver;

/**
 * Paren-pairing highlight (added alongside §7.7b's operator-highlighting work).
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
});
