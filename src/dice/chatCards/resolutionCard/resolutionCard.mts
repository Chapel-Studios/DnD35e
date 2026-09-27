/**
 * Resolution chat card (poc.10 Story E, §10.7) — posted once `WeaponAttackDataModel#_continue()`
 * resolves an attack card target row's `'damage'` step: shows final hit/miss (+ confirmed
 * critical, concealment miss note), and on a hit, the rolled damage — already applied to the
 * target's HP as part of posting this card (no separate manual "Apply Damage" step). Carries
 * the one Undo button available for this exchange, reversing the exact HP delta and refunding
 * the attacker's spent action economy.
 *
 * @module
 */
import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import { ActionLifeCycle } from '@actors/baseActor/events/ActionLifeCycle.mjs';
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { Creature } from '@actors/creature/Creature.mjs';
import { HP_ADJUSTMENT_TYPE } from '@actors/creature/sheet/components/constants.mjs';
import type { ChatMessageSource } from '@common/documents/chat-message.mjs';
import { STANDARD_ACTION } from '@constants/actionEconomy.mjs';
import type { WieldedHand } from '@constants/equipmentSlots.mjs';
import { refundAction, refundHandBab } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { ActionParticipant } from '@items/baseItem/actions/logic/actionParticipant.mjs';
import { participantActor, participantToken } from '@items/baseItem/actions/logic/actionParticipant.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import type { CheckMode } from '@source/rollDialogs/RollDefenseDialog/types.mjs';

import type { DamageRoll } from '../../DamageRoll.mjs';
import { resolveVisibleActorName } from '../attackRollCard/attackRollCard.mjs';
import type { DefenseEvaluation } from './evaluateDefense.mjs';
import resolutionCardTemplateSource from './resolution-card.hbs?raw';

const resolutionCardTemplate = Handlebars.compile(resolutionCardTemplateSource, { preventIndent: true });

/** Data a caller (`WeaponAttackDataModel#continue()`) computes about the resolution — everything `buildResolutionCard()` needs beyond the actor/target themselves. */
interface ResolutionCardData extends DefenseEvaluation {
  weaponName: string;
  checkMode: CheckMode;
  damageType: string;
  nonLethal: boolean;
  applyHalfDamage: boolean;
  actionEconomySpent: { standardActionSpent: boolean; hand: WieldedHand; babSpent: number } | null;
}

/** Persisted in `message.flags.dnd35e.resolutionCard` — everything needed to re-render the card and reverse it on Undo. */
interface ResolutionCardFlags extends ResolutionCardData {
  attackerUuid: string;
  attackerTokenUuid: string | null;
  targetUuid: string;
  targetTokenUuid: string | null;
  /** Rolled damage total before any Apply Half Damage halving, for display only — `null` on a miss. */
  damageTotal: number | null;
  /** Amount actually applied to the target's HP (post-halving) — what Undo reverses. `0` on a miss. */
  appliedAmount: number;
  undone: boolean;
}

/** Shared by the initial post and the Undo click handler's re-render. */
function buildResolutionCardContent(flags: ResolutionCardFlags): string {
  return resolutionCardTemplate({
    weaponName: flags.weaponName,
    attackerUuid: flags.attackerUuid,
    targetUuid: flags.targetUuid,
    targetTokenUuid: flags.targetTokenUuid,
    attackerHeaderLabel: game.i18n.localize('dnd35e.ROLL.Attacker'),
    targetHeaderLabel: game.i18n.localize('dnd35e.ROLL.Defender'),
    resultLabel: flags.hit ? game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.Hit') : game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.Miss'),
    hit: flags.hit,
    criticalHit: flags.criticalHit,
    criticalHitLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.CriticalHit'),
    concealmentMissed: flags.concealmentMissed,
    concealedLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.Concealed'),
    effectiveAcLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.EffectiveAc'),
    effectiveAc: flags.effectiveAc,
    showEffectiveAc: flags.checkMode !== 'noCheck',
    hasDamage: flags.damageTotal !== null,
    damageAppliedLabel: flags.nonLethal
      ? game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.NonLethalApplied')
      : game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.DamageApplied'),
    appliedAmount: flags.appliedAmount,
    damageTotal: flags.damageTotal,
    showHalved: flags.applyHalfDamage,
    halfDamageLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.HalfDamage'),
    undoLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.Undo'),
    undoneLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.Undone'),
    showUndo: flags.appliedAmount > 0 || flags.actionEconomySpent !== null,
    undone: flags.undone,
  });
}

/**
 * Posts the Resolution card and — on a hit — applies the rolled damage to the target's HP as
 * part of doing so; there is no separate manual "Apply Damage" step (poc.10 §10.7). `damageRoll`
 * is `null` on a miss (nothing was rolled). `attacker`/`target` are already-resolved
 * `ActionParticipant`s (§10.7 token-preference policy) — their token UUIDs (if any) are read
 * directly off them rather than threaded through as separate params.
 */
async function buildResolutionCard(
  attacker: ActionParticipant,
  target: ActionParticipant,
  data: ResolutionCardData,
  damageRoll: DamageRoll | null
): Promise<ChatMessage | undefined> {
  const attackerActor = participantActor(attacker);
  const targetActor = participantActor(target);
  const attackerTokenUuid = participantToken(attacker)?.document.uuid ?? null;
  const targetTokenUuid = participantToken(target)?.document.uuid ?? null;

  let appliedAmount = 0;
  if (data.hit && damageRoll) {
    const rawTotal = damageRoll.total ?? 0;
    appliedAmount = data.applyHalfDamage ? Math.floor(rawTotal / 2) : rawTotal;
    const adjustmentType = data.nonLethal ? HP_ADJUSTMENT_TYPE.NONLETHAL_ADJUSTMENT : HP_ADJUSTMENT_TYPE.DAMAGE_ADJUSTMENT;
    await targetActor.updateHP(appliedAmount, adjustmentType, { attackerId: attackerActor.id, damageType: data.damageType });
    await targetActor.events.emit(ActionLifeCycle.dealDamage, { amount: appliedAmount, damageType: data.damageType, target: targetActor });
  }

  const flags: ResolutionCardFlags = {
    ...data,
    attackerUuid: attackerActor.uuid,
    attackerTokenUuid,
    targetUuid: targetActor.uuid,
    targetTokenUuid,
    damageTotal: damageRoll ? damageRoll.total ?? 0 : null,
    appliedAmount,
    undone: false,
  };

  const content = buildResolutionCardContent(flags);
  const messageData = {
    content,
    speaker: ChatMessage.getSpeaker({ actor: attackerActor }),
    flags: { dnd35e: { resolutionCard: flags } },
  } as unknown as ChatMessageSource;

  // Same `roll.toMessage()` convention as the attack card (3D dice, blind/private handling) —
  // only meaningful when a roll actually happened (a miss has nothing to attach).
  const message = damageRoll
    ? await damageRoll.toMessage(messageData, { messageMode: game.settings.get('core', 'rollMode') as string })
    : await ChatMessage.create(messageData);

  return message ?? undefined;
}

/**
 * Reverses the exact HP delta this card applied (not a restore of an absolute HP snapshot —
 * composes safely even if other damage/healing landed on the target in between), refunds the
 * attacker's spent action economy (if any), emits `undoDealDamage`, and re-renders the card.
 * Bypasses `updateHP()`'s adjustment-type dispatch (same reasoning as `moveActionCard.mts`'s
 * `snapTokenToPosition` bypassing the normal movement pipeline) — a plain damage/heal update
 * doesn't cleanly reverse either the lethal or non-lethal case, and would risk being mistaken
 * for a fresh, independent heal.
 */
async function onUndoResolution(message: ChatMessage, flags: ResolutionCardFlags): Promise<void> {
  if (flags.undone) return;

  const target = foundry.utils.fromUuidSync(flags.targetUuid) as ACTORS_DND35E | null;
  if (target && flags.appliedAmount > 0) {
    if (flags.nonLethal) {
      const newNonlethal = Math.max(0, target.system.hp.nonlethal - flags.appliedAmount);
      await target.update({ 'system.hp.nonlethal': newNonlethal });
    } else {
      const newHp = Math.min(target.system.hp.max, target.system.hp.current + flags.appliedAmount);
      await target.update({ 'system.hp.current': newHp });
    }
    await target.events.emit(ActionLifeCycle.undoDealDamage, { amount: flags.appliedAmount, damageType: flags.damageType, target });
  }

  if (flags.actionEconomySpent) {
    const attacker = foundry.utils.fromUuidSync(flags.attackerUuid) as Creature | null;
    const combatant = attacker
      ? game.combat?.combatants.find(c => c.actor?.uuid === attacker.uuid) as CombatantDnd35e | undefined
      : undefined;
    if (combatant && attacker) {
      if (flags.actionEconomySpent.standardActionSpent) await refundAction(combatant, [STANDARD_ACTION]);
      await refundHandBab(combatant, flags.actionEconomySpent.hand, flags.actionEconomySpent.babSpent, attacker);
    }
  }

  const updatedFlags: ResolutionCardFlags = { ...flags, undone: true };
  await message.update({
    content: buildResolutionCardContent(updatedFlags),
    'flags.dnd35e.resolutionCard': updatedFlags,
  });
}

/** Wires the "Undo" button, gated to GM/target-owner — see registerChatCardActions.mts. */
function wireResolutionCardButton(message: ChatMessage, html: HTMLElement): void {
  const flags = message.getFlag(SYSTEM_ID, 'resolutionCard') as ResolutionCardFlags | undefined;
  if (!flags) return;

  const setName = (el: HTMLElement | null, uuid: string | undefined, tokenUuid?: string | null): void => {
    if (!el || !uuid) return;
    el.textContent = resolveVisibleActorName(uuid, game.user, tokenUuid);
  };
  setName(html.querySelector<HTMLElement>('[data-attacker-uuid]'), flags.attackerUuid, flags.attackerTokenUuid);
  setName(html.querySelector<HTMLElement>('[data-target-uuid]'), flags.targetUuid, flags.targetTokenUuid);

  const undoButton = html.querySelector<HTMLElement>('[data-action="undo-resolution"]');
  if (!undoButton) return;

  const target = foundry.utils.fromUuidSync(flags.targetUuid) as ActorDnd35e | null;
  if (!target || !(game.user?.isGM || target.isOwner)) {
    undoButton.remove();
    return;
  }
  undoButton.addEventListener('click', () => { void onUndoResolution(message, flags); });
}

export { buildResolutionCard, wireResolutionCardButton };
export type { ResolutionCardData, ResolutionCardFlags };
