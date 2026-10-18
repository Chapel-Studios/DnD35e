/**
 * modifier-breakdown.hbs's compiled partial + the shared "append breakdown to a roll's own
 * dice tooltip" helper every chat card's `diceRollHtml` construction uses.
 *
 * @module
 */
import type { RollModifier } from '../../types.mjs';
import modifierBreakdownTemplateSource from './modifier-breakdown.hbs?raw';

const modifierBreakdownTemplate = Handlebars.compile(modifierBreakdownTemplateSource, { preventIndent: true });

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

/** Renders the modifier-breakdown partial for a labeled modifier list. Carries the same
 * bonus-type tag + ignored/struck-through styling `HasActiveEffectsNotification` shows on the
 * sheet (see `buildOverridesModifierList`) — ignored entries render with their `stackReason`. */
function buildModifierBreakdownHtml(modifierList: RollModifier[]): string {
  return modifierBreakdownTemplate({
    modifiers: modifierList.map(modifier => ({
      label: modifier.label,
      signed: modifier.formula ?? formatSigned(modifier.value),
      bonusTypeLabel: modifier.bonusTypeLabel,
      isIgnored: modifier.isIgnored,
      ignoredReason: modifier.ignoredReason,
    })),
  });
}

/**
 * Renders the same modifier-breakdown partial with raw (unsigned) values — e.g. the
 * Resolution card's AC Details table, where the first row is a total (base AC), not a
 * modifier, mirroring D35E's `damage-description.html` `acModifiers` table.
 */
function buildRawBreakdownHtml(rows: RollModifier[]): string {
  return modifierBreakdownTemplate({
    modifiers: rows.map(row => ({ label: row.label, signed: String(row.value) })),
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

/** Combines `buildModifierBreakdownHtml()` + `appendModifierBreakdown()` against a roll's own tooltip — the common case every card uses. Accepts any `Roll` subclass (`D20Roll`, `DamageRoll`, ...) since only `getTooltip()` is needed. */
async function buildDiceRollHtmlWithModifiers(roll: Roll, modifierList: RollModifier[]): Promise<string> {
  return appendModifierBreakdown(await roll.getTooltip(), buildModifierBreakdownHtml(modifierList));
}

export {
  appendModifierBreakdown,
  buildDiceRollHtmlWithModifiers,
  buildModifierBreakdownHtml,
  buildRawBreakdownHtml,
  formatSigned,
};
