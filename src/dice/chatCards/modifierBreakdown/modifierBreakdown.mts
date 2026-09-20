/**
 * modifier-breakdown.hbs's compiled partial + the shared "append breakdown to a roll's own
 * dice tooltip" helper every chat card's `diceRollHtml` construction uses.
 *
 * @module
 */
import type { D20Roll } from '../../D20Roll.mjs';
import type { RollModifier } from '../../types.mjs';
import modifierBreakdownTemplateSource from './modifier-breakdown.hbs?raw';

const modifierBreakdownTemplate = Handlebars.compile(modifierBreakdownTemplateSource, { preventIndent: true });

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

/** Renders the modifier-breakdown partial for a labeled modifier list. */
function buildModifierBreakdownHtml(modifierList: RollModifier[]): string {
  return modifierBreakdownTemplate({
    modifiers: modifierList.map(modifier => ({ label: modifier.label, signed: formatSigned(modifier.value) })),
  });
}

/**
 * Append the modifier breakdown as the last child of `.dice-tooltip > .wrapper` (see
 * `Roll#getTooltip()`/`templates/dice/tooltip.hbs`), after the individual die-face rows.
 * Falls back to leaving `diceTooltipHtml` untouched if there's no wrapper to append to (e.g.
 * a private roll, where `getTooltip()` returns an empty string).
 */
function appendModifierBreakdown(diceTooltipHtml: string, modifierBreakdownHtml: string): string {
  const wrapperCloseAtEnd = /<\/div>\s*<\/div>\s*$/;
  if (!wrapperCloseAtEnd.test(diceTooltipHtml)) return diceTooltipHtml;
  return diceTooltipHtml.replace(wrapperCloseAtEnd, match => modifierBreakdownHtml + match);
}

/** Combines `buildModifierBreakdownHtml()` + `appendModifierBreakdown()` against a roll's own tooltip — the common case every card uses. */
async function buildDiceRollHtmlWithModifiers(roll: D20Roll, modifierList: RollModifier[]): Promise<string> {
  return appendModifierBreakdown(await roll.getTooltip(), buildModifierBreakdownHtml(modifierList));
}

export {
  appendModifierBreakdown,
  buildDiceRollHtmlWithModifiers,
  buildModifierBreakdownHtml,
  formatSigned,
};
