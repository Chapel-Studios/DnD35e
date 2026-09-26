/**
 * Attack Roll chat card (poc.10 Story D, §10.8): die face/total, modifier breakdown,
 * unrolled damage-formula preview, and one row per target. The "Change Target(s)" button
 * re-syncs unresolved rows to the user's current `game.user.targets` — Story E adds the
 * "Apply" button/hit-resolution alongside `continue()`'s real body.
 *
 * @module
 */
import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { ChatMessageSource } from '@common/documents/chat-message.mjs';
import type { WieldedHand } from '@constants/equipmentSlots.mjs';
import { canUserSeeActorName } from '@documents/token/logic/tokenNameVisibility.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import type { D20Roll } from '../../D20Roll.mjs';
import type { RollModifier } from '../../types.mjs';
import { buildDiceRollHtmlWithModifiers } from '../modifierBreakdown/modifierBreakdown.mjs';
import { parseActionChainId } from './actionChainSteps.mjs';
import attackRollCardTemplateSource from './attack-roll-card.hbs?raw';

const attackRollCardTemplate = Handlebars.compile(attackRollCardTemplateSource, { preventIndent: true });

/** One target row on the attack card — `resolved` flips true once Story E's hit resolution runs. */
interface AttackCardTargetRow {
  actorUuid: string;
  targetName: string;
  targetImage: string;
  resolved: boolean;
}

/**
 * Persisted in `message.flags.dnd35e.attackCard` — everything needed to re-render the card
 * (Change Target(s)) or, in Story E, resolve the hit. `actionChainId` is `buildActionChainId()`'s
 * composite actor/item/action id (see `actionChainSteps.mts`), letting button handlers resolve
 * back to the live documents without duplicating actor/item/action data onto the flags.
 */
interface AttackCardFlags {
  actionChainId: string;
  attackerName: string;
  attackerImage: string;
  weaponName: string;
  hand: WieldedHand;
  nonLethal: boolean;
  /** Unrolled damage formula (STR term included), snapshotted at attack-roll time — actually rolled by Story E's `continue()`. */
  resolvedDamageFormula: string;
  /** Damage-bonus formula term (e.g. `' + 1d6'`), already prefixed with its own sign/operator, or `''` when none was entered. */
  damageBonusTerm: string;
  /** Threat range floor (e.g. 19 for a 19–20 weapon) — passed to `roll.isCriticalThreat()` instead of assuming a bare natural 20. */
  critRange: number;
  critMultiplier: number;
  /** Eagerly-rolled confirmation total (poc.10 Story D) — present only when the primary roll threatened a critical; `null` otherwise. Story E compares it against the target's final AC. */
  critConfirmTotal: number | null;
  targets: AttackCardTargetRow[];
  actionEconomySpent: { standardActionSpent: boolean; hand: WieldedHand; babSpent: number } | null;
  /** Persisted so the Change Target(s) handler can rebuild `diceRollHtml` without re-deriving the roll's own modifier breakdown. */
  modifierList: RollModifier[];
}

/** Shared by the initial post and the Change Target(s) click handler's re-render. */
function buildAttackCardContent(roll: D20Roll, flags: AttackCardFlags, diceRollHtml: string): string {
  const primaryTarget = flags.targets[0];
  const attackerUuid = parseActionChainId(flags.actionChainId)?.actorUuid ?? null;
  return attackRollCardTemplate({
    actorImage: flags.attackerImage,
    actorName: flags.attackerName,
    attackerUuid,
    weaponName: flags.weaponName,
    // Mirrors the Roll Dialog's Attacker/Defender header labels (§10.8 parity).
    attackerHeaderLabel: game.i18n.localize('dnd35e.ROLL.Attacker'),
    targetHeaderLabel: game.i18n.localize('dnd35e.ROLL.Defender'),
    targetName: primaryTarget?.targetName ?? null,
    targetImage: primaryTarget?.targetImage ?? '',
    targetUuid: primaryTarget?.actorUuid ?? null,
    resultLabel: game.i18n.localize('dnd35e.ROLL.Result'),
    changeTargetsLabel: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.ChangeTargets'),
    damagePreviewLabel: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.DamagePreview'),
    nonLethalLabel: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.NonLethal'),
    rollFormula: roll.displayFormula,
    total: roll.total ?? 0,
    isFumble: roll.isFumble,
    isCriticalThreat: roll.isCriticalThreat(flags.critRange),
    confirmCriticalLabel: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.ConfirmCritical'),
    hasCritConfirm: flags.critConfirmTotal !== null,
    critConfirmTotal: flags.critConfirmTotal,
    diceRollHtml,
    damageFormulaDisplay: `${flags.resolvedDamageFormula}${flags.damageBonusTerm}`,
    critMultiplier: flags.critMultiplier,
    nonLethal: flags.nonLethal,
    targets: flags.targets,
  });
}

async function buildAttackCard(
  actor: ActorDnd35e,
  roll: D20Roll,
  modifierList: RollModifier[],
  flags: AttackCardFlags,
  rollMode: string,
  confirmRoll: D20Roll | null = null
): Promise<ChatMessage | undefined> {
  const diceRollHtml = await buildDiceRollHtmlWithModifiers(roll, modifierList);
  const content = buildAttackCardContent(roll, flags, diceRollHtml);

  // `roll.toMessage()` (not a plain `ChatMessage.create()`) so the roll itself round-trips
  // correctly (`message.rolls`, 3D dice module integration, blind/private roll handling) —
  // same pipeline `rollSave()` uses.
  const message = await roll.toMessage(
    {
      content,
      speaker: ChatMessage.getSpeaker({ actor }),
      flags: { dnd35e: { attackCard: flags } },
    } as unknown as ChatMessageSource,
    { messageMode: rollMode }
  );

  // `toMessage()` hardcodes `rolls: [this]` — the already-evaluated confirmation roll is
  // attached in a follow-up update instead of fighting that.
  if (message && confirmRoll) {
    await message.update({ rolls: [roll, confirmRoll] } as unknown as Partial<ChatMessageSource>);
  }

  return message;
}

/**
 * Re-syncs the card's unresolved target rows to whatever's currently targeted on the canvas
 * (poc.10 §10.8) — already-`resolved` rows (Story E's hit resolution) are left untouched.
 * `diceRollHtml` is fully rebuilt (not string-patched) from the persisted `modifierList` +
 * the roll stored on the message, since `content` is a flat HTML blob with no partial-update
 * hook.
 */
async function onRetarget(message: ChatMessage, flags: AttackCardFlags): Promise<void> {
  const resolvedRows = flags.targets.filter(target => target.resolved);
  const newRows: AttackCardTargetRow[] = Array.from(game.user?.targets ?? [])
    .filter(token => !!token.actor)
    .map(token => ({ actorUuid: token.actor!.uuid, targetName: token.name, targetImage: token.actor!.img ?? '', resolved: false }));
  const updatedFlags: AttackCardFlags = { ...flags, targets: [...resolvedRows, ...newRows] };

  const roll = message.rolls[0] as D20Roll;
  const diceRollHtml = await buildDiceRollHtmlWithModifiers(roll, flags.modifierList);
  await message.update({
    content: buildAttackCardContent(roll, updatedFlags, diceRollHtml),
    'flags.dnd35e.attackCard': updatedFlags,
  });
}

/**
 * Redacts the attacker/target name(s) rendered into the card's static, shared `content`
 * HTML for the CURRENT viewer only (poc.10 Story D follow-up) — `content` is one string
 * persisted on the message and identical for every client, so this must re-run per viewer
 * at actual render time rather than baking a single name in at author time. GM viewers are
 * left untouched (`canUserSeeActorName()` always allows them).
 */
function redactAttackCardNames(message: ChatMessage, html: HTMLElement): void {
  const flags = message.getFlag(SYSTEM_ID, 'attackCard') as AttackCardFlags | undefined;
  if (!flags) return;

  const hiddenName = game.i18n.localize('dnd35e.ROLL.HiddenName');
  const redact = (el: HTMLElement | null, uuid: string | undefined): void => {
    if (!el || !uuid) return;
    const revealedActor = foundry.utils.fromUuidSync(uuid) as unknown as ACTORS_DND35E | null;
    if (!canUserSeeActorName(revealedActor, game.user)) el.textContent = hiddenName;
  };

  const attackerUuid = parseActionChainId(flags.actionChainId)?.actorUuid;
  redact(html.querySelector<HTMLElement>('[data-attacker-uuid]'), attackerUuid);
  redact(html.querySelector<HTMLElement>('.actor-info.target [data-target-uuid]'), flags.targets[0]?.actorUuid);
  html.querySelectorAll<HTMLElement>('.target-row [data-target-uuid]').forEach((el) => {
    redact(el, el.dataset.targetUuid);
  });
}

/** Wires the "Change Target(s)" button, gated to GM/attacker-owner — see registerChatCardActions.mts. */
function wireAttackRollCardButton(message: ChatMessage, html: HTMLElement): void {
  redactAttackCardNames(message, html);

  const retargetButton = html.querySelector<HTMLElement>('[data-action="retarget"]');
  if (!retargetButton) return;

  const flags = message.getFlag(SYSTEM_ID, 'attackCard') as AttackCardFlags | undefined;
  const parsed = flags ? parseActionChainId(flags.actionChainId) : null;
  const attacker = parsed ? foundry.utils.fromUuidSync(parsed.actorUuid) as ActorDnd35e | null : null;
  if (!flags || !attacker || !(game.user?.isGM || attacker.isOwner)) {
    retargetButton.remove();
    return;
  }
  retargetButton.addEventListener('click', () => { void onRetarget(message, flags); });
}

export { buildAttackCard, buildAttackCardContent, wireAttackRollCardButton };
export type { AttackCardFlags, AttackCardTargetRow };
