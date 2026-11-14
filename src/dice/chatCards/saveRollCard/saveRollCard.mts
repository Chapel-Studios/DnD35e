/**
 * Saving throw / initiative chat card. Initiative has no DC/pass-fail concept, so
 * `buildInitiativeCard()` is a thin wrapper around `buildSaveCard()`'s own pipeline rather
 * than its own template.
 *
 * @module
 */
import type { D20Roll } from '../../D20Roll.mjs';
import type { RollModifier } from '../../types.mjs';
import { resolveVisibleActorName } from '../attackRollCard/attackRollCard.mjs';
import { buildDiceRollHtmlWithModifiers } from '../modifierBreakdown/modifierBreakdown.mjs';
import saveRollCardTemplateSource from './save-roll-card.hbs?raw';

const saveRollCardTemplate = Handlebars.compile(saveRollCardTemplateSource, { preventIndent: true });

/** Options for `buildSaveCard()` beyond the roll and its modifier breakdown. */
interface BuildSaveCardOptions {
  /** Speaking actor's display name — baked in once at build time for the no-JS/initial render; `wireSaveRollCardButton()` re-resolves this per viewing client afterward (poc.10 Story I: name masking must not leak via a statically-rendered chat card). */
  actorName: string;
  actorImage: string;
  /** Acting actor's UUID — re-resolved per client by `wireSaveRollCardButton()`. */
  actorUuid: string;
  /** Acting token's UUID, if any (see `resolveVisibleActorName()`). */
  tokenUuid?: string | null;
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
    actorUuid: opts.actorUuid,
    tokenUuid: opts.tokenUuid ?? null,
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

async function buildInitiativeCard(
  roll: D20Roll,
  modifierList: RollModifier[],
  opts: { actorName: string; actorImage: string; actorUuid: string; tokenUuid?: string | null }
): Promise<string> {
  return buildSaveCard(roll, modifierList, {
    actorName: opts.actorName,
    actorImage: opts.actorImage,
    actorUuid: opts.actorUuid,
    tokenUuid: opts.tokenUuid,
    saveLabel: game.i18n.localize('dnd35e.ROLL.Initiative'),
  });
}

/**
 * Re-resolves the displayed actor name per viewing client (poc.10 Story I). The name baked
 * into `content` at build time reflects whoever triggered the roll (often the GM rolling
 * "Roll All") — without this, a masked name would leak to every viewer whenever the roller
 * happened to be privileged. Mirrors `attackRollCard.mts`'s identical `setName()` pattern.
 */
function wireSaveRollCardButton(_message: ChatMessage, html: HTMLElement): void {
  const el = html.querySelector<HTMLElement>('.save-roll-card .value[data-actor-uuid]');
  if (!el) return;
  const actorUuid = el.dataset.actorUuid;
  if (!actorUuid) return;
  const tokenUuid = el.dataset.tokenUuid ?? null;
  const name = resolveVisibleActorName(actorUuid, game.user, tokenUuid);
  // Preserve the trailing " -" separator the template renders alongside the name.
  el.textContent = `${name} -`;
}

export { buildInitiativeCard, buildSaveCard, wireSaveRollCardButton };
export type { BuildSaveCardOptions };
