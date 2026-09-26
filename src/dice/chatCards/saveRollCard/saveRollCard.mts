/**
 * Saving throw / initiative chat card. Initiative has no DC/pass-fail concept, so
 * `buildInitiativeCard()` is a thin wrapper around `buildSaveCard()`'s own pipeline rather
 * than its own template.
 *
 * @module
 */
import type { D20Roll } from '../../D20Roll.mjs';
import type { RollModifier } from '../../types.mjs';
import { buildDiceRollHtmlWithModifiers } from '../modifierBreakdown/modifierBreakdown.mjs';
import saveRollCardTemplateSource from './save-roll-card.hbs?raw';

const saveRollCardTemplate = Handlebars.compile(saveRollCardTemplateSource, { preventIndent: true });

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

/**
 * Build the HTML content for a saving throw chat card: header, die face + total, natural
 * 1/20 callouts, and a collapsible dice/modifier breakdown. Our own `.roll-result` header
 * (not Foundry's default `.dice-roll` formula/total rows, which would duplicate the total
 * already shown above) is the `data-action="expandRoll"` click target, so only the raw die
 * faces are pulled in via `Roll#getTooltip()`. An optional pass/fail indicator is shown when
 * `opts.dc` is set.
 */
async function buildSaveCard(roll: D20Roll, modifierList: RollModifier[], opts: BuildSaveCardOptions): Promise<string> {
  const dieResult = roll.naturalResult ?? 0;
  const total = roll.total ?? 0;
  const passed = opts.dc === undefined ? null : total >= opts.dc;
  const diceRollHtml = await buildDiceRollHtmlWithModifiers(roll, modifierList);

  return saveRollCardTemplate({
    actorImage: opts.actorImage,
    actorName: opts.actorName,
    resultLabel: game.i18n.localize('dnd35e.ROLL.Result'),
    saveLabel: opts.saveLabel,
    rollFormula: roll.displayFormula,
    dieResult,
    total,
    isFumble: roll.isFumble,
    isCriticalThreat: roll.isCriticalThreat(),
    diceRollHtml,
    showResult: opts.dc !== undefined,
    passed,
  });
}

async function buildInitiativeCard(roll: D20Roll, modifierList: RollModifier[], opts: { actorName: string; actorImage: string }): Promise<string> {
  return buildSaveCard(roll, modifierList, {
    actorName: opts.actorName,
    actorImage: opts.actorImage,
    saveLabel: game.i18n.localize('dnd35e.ROLL.Initiative'),
  });
}

export { buildInitiativeCard, buildSaveCard };
export type { BuildSaveCardOptions };
