/**
 * Chat message assembly for D20-based rolls. The card template is precompiled from raw
 * `.hbs` source at module load (same pattern as `TokenRulerDnd35e`'s waypoint label) rather
 * than fetched via Foundry's async `renderTemplate()` — the Vue migration removed the
 * static `.hbs`-over-HTTP pipeline, so `.hbs` files are only ever imported via `?raw` and
 * compiled in-memory.
 *
 * @module
 */
import type { D20Roll } from './D20Roll.mjs';
import modifierBreakdownTemplateSource from './templates/modifier-breakdown.hbs?raw';
import saveRollCardTemplateSource from './templates/save-roll-card.hbs?raw';
import type { RollModifier } from './types.mjs';

const saveRollCardTemplate = Handlebars.compile(saveRollCardTemplateSource, { preventIndent: true });
const modifierBreakdownTemplate = Handlebars.compile(modifierBreakdownTemplateSource, { preventIndent: true });

/** Options for `buildSaveCard()` beyond the roll and its modifier breakdown. */
interface BuildSaveCardOptions {
  /** Speaking actor's display name. */
  actorName: string;
  actorImage: string;
  /** Already-localized save name, e.g. "Fortitude". */
  saveLabel: string;
  /** Optional DC — when provided, the card shows a pass/fail indicator. */
  dc?: number;
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

/**
 * Build the HTML content for a saving throw chat card: header, die face + total, natural
 * 1/20 callouts, and a collapsible dice/modifier breakdown. Our own `.roll-result` header
 * (not Foundry's default `.dice-roll` formula/total rows, which would duplicate the total
 * already shown above) is the `data-action="expandRoll"` click target, so only the raw die
 * faces are pulled in via `Roll#getTooltip()`. The modifier breakdown is appended after the
 * die faces (see `appendModifierBreakdown()`) so both expand/collapse together. An optional
 * pass/fail indicator is shown when `opts.dc` is set.
 */
async function buildSaveCard(roll: D20Roll, modifierList: RollModifier[], opts: BuildSaveCardOptions): Promise<string> {
  const dieResult = roll.naturalResult ?? 0;
  const total = roll.total ?? 0;
  const passed = opts.dc === undefined ? null : total >= opts.dc;
  const modifierBreakdownHtml = modifierBreakdownTemplate({
    modifiers: modifierList.map(modifier => ({ label: modifier.label, signed: formatSigned(modifier.value) })),
  });
  const diceRollHtml = appendModifierBreakdown(await roll.getTooltip(), modifierBreakdownHtml);

  return saveRollCardTemplate({
    actorImage: opts.actorImage,
    actorName: opts.actorName,
    resultLabel: game.i18n.localize('dnd35e.ROLL.Result'),
    saveLabel: opts.saveLabel,
    rollFormula: roll.formula,
    dieResult,
    total,
    isFumble: roll.isFumble,
    isCriticalThreat: roll.isCriticalThreat,
    diceRollHtml,
    showResult: opts.dc !== undefined,
    passed,
  });
}

/**
 * Build the HTML content for an initiative roll chat card. Initiative has no DC/pass-fail
 * concept, so this is a thin wrapper around `buildSaveCard()`'s pipeline (same header/die
 * face/modifier-breakdown template) with `saveLabel` set to "Initiative" and no `dc`.
 */
async function buildInitiativeCard(roll: D20Roll, modifierList: RollModifier[], opts: { actorName: string; actorImage: string }): Promise<string> {
  return buildSaveCard(roll, modifierList, {
    actorName: opts.actorName,
    actorImage: opts.actorImage,
    saveLabel: game.i18n.localize('dnd35e.ROLL.Initiative'),
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

export { buildInitiativeCard, buildSaveCard };
