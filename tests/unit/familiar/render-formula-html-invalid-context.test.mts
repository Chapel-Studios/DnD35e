import { FormulaResolver } from '@helpers/formulae/FormulaResolver.mjs';
import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
import { renderFormulaHTML } from '@helpers/formulae/utils.mjs';
import { describe, expect, it } from 'vitest';

const { parseFormula, validateFormula } = FormulaResolver;

/**
 * Regression test for a reported bug: typing `#TEA.sucks` (an unrecognized context
 * `TEA` followed by a property) rendered the `#TEA.` prefix in the normal "valid" blue
 * color, with only the trailing `sucks` segment marked red — even though `TEA` itself
 * isn't a real context at all.
 *
 * The in-progress (`!complete`, still typing/no trailing space) split-highlight branch
 * in `renderFormulaHTML()` used to unconditionally treat everything before the LAST `.`
 * as valid whenever the final segment didn't partially match ANY familiar option,
 * without checking whether the context itself (or any intermediate segment) actually
 * resolved. Fixed by gating that split on `hasValidPathPrefix()` — an unresolvable
 * context now renders the WHOLE token as `is-error`, not just its last segment.
 */
const schema: FamiliarSchema = {
  self: { properties: { level: { type: 'number', accessPath: 'system.level', value: '5' } } },
};

describe('renderFormulaHTML — invalid context highlighting', () => {
  it('marks the entire token as is-error when the context itself is unrecognized (in-progress, no trailing space)', () => {
    const formula = '#TEA.sucks';
    const html = renderFormulaHTML(formula, parseFormula(formula), validateFormula(formula, schema), schema, true);

    const variableSpans = html.match(/<span class="formula-variable[^>]*>[\s\S]*<\/span>/g) ?? [];
    expect(variableSpans).toHaveLength(1);
    // The whole token — including the "TEA." prefix — must be flagged, not just "sucks".
    expect(variableSpans[0]).toContain('is-error');
    expect(variableSpans[0]).not.toMatch(/formula-variable"[^<]*<span class="is-error">sucks<\/span>/);
  });

  it('still splits blue-prefix/red-suffix when the context IS valid but the final segment is not', () => {
    const formula = '#self.doesnotexist';
    const html = renderFormulaHTML(formula, parseFormula(formula), validateFormula(formula, schema), schema, true);

    // Valid context ("self") + unresolvable last segment → split coloring is still expected.
    expect(html).toContain('<span class="is-error">doesnotexist</span>');
  });
});
