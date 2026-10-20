/**
 * Resolution chat card (poc.10 Story E, §10.7) — posted once `WeaponAttackDataModel#_continue()`
 * resolves an attack card target row's `'damage'` step: shows final hit/miss (+ confirmed
 * critical, concealment miss note), and on a hit, the rolled damage — computed but NOT yet
 * applied to the target's HP. Applying is a separate, explicit step: the GM/owner clicks the
 * card's own Apply Damage button (`onApplyDamage()`), mirroring the attack card's Apply/Reapply
 * convention, so there's a chance to review the roll before it lands. Carries the one Undo
 * button available for this exchange, reversing the exact HP delta (once applied) and
 * refunding the attacker's spent action economy.
 *
 * @module
 */
import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import { ActionLifeCycle } from '@actors/baseActor/events/ActionLifeCycle.mjs';
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { Creature } from '@actors/creature/Creature.mjs';
import { HP_ADJUSTMENT_TYPE } from '@actors/creature/sheet/components/constants.mjs';
import type { ChatMessageSource } from '@common/documents/chat-message.mjs';
import type { WieldedHand } from '@constants/equipmentSlots.mjs';
import type { AttackActionSpend } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import { refundAttackAction, refundHandBab } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { ActionParticipant } from '@items/baseItem/actions/logic/actionParticipant.mjs';
import { participantActor, participantToken } from '@items/baseItem/actions/logic/actionParticipant.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import type { CheckMode } from '@source/rollDialogs/RollDefenseDialog/types.mjs';

import type { DamageRoll } from '../../DamageRoll.mjs';
import type { RollModifier } from '../../types.mjs';
import { resolveVisibleActorName } from '../attackRollCard/attackRollCard.mjs';
import { buildDiceRollHtmlWithModifiers, buildRawBreakdownHtml } from '../modifierBreakdown/modifierBreakdown.mjs';
import { syncMovementCardSpend } from '../moveActionCard/moveActionCard.mjs';
import type { DefenseEvaluation } from './evaluateDefense.mjs';
import resolutionCardTemplateSource from './resolution-card.hbs?raw';

const resolutionCardTemplate = Handlebars.compile(resolutionCardTemplateSource, { preventIndent: true });

/** Data a caller (`WeaponAttackDataModel#continue()`) computes about the resolution — everything `buildResolutionCard()` needs beyond the actor/target themselves. */
interface ResolutionCardData extends DefenseEvaluation {
  attackName: string;
  checkMode: CheckMode;
  damageType: string;
  nonLethal: boolean;
  applyHalfDamage: boolean;
  actionEconomySpent: (AttackActionSpend & { hand: WieldedHand; babSpent: number }) | null;
  /** Labeled breakdown (Str modifier, damage situational bonus) for the damage roll's dice tooltip — see `_buildDamageSnapshot()`. Empty on a miss. */
  damageModifierList: RollModifier[];
}

/** Persisted in `message.flags.dnd35e.resolutionCard` — everything needed to re-render the card and reverse it on Undo. */
interface ResolutionCardFlags extends ResolutionCardData {
  attackerHeaderLabel: string;
  attackerUuid: string;
  attackerTokenUuid: string | null;
  attackerImage: string;
  targetHeaderLabel: string;
  targetUuid: string;
  targetTokenUuid: string | null;
  targetImage: string;
  /** Rolled damage total before any Apply Half Damage halving, for display only — `null` on a miss. */
  damageTotal: number | null;
  /** Amount to be applied (post-halving) to the target's HP once Apply Damage is clicked — what Undo reverses. `0` on a miss. */
  appliedAmount: number;
  /** Whether `appliedAmount` has actually been written to the target's HP yet — decouples "damage was rolled" (`damageTotal`/`hasDamage`) from "damage was applied" so the GM/owner can review before committing. */
  applied: boolean;
  undone: boolean;
}

// const x: ResolutionCardFlags = {
//   attacke
// };

/** Shared by the initial post and the Undo click handler's re-render. */
function buildResolutionCardContent(flags: ResolutionCardFlags, diceRollHtml: string): string {
  return resolutionCardTemplate({
    attackName: flags.attackName,
    attackerUuid: flags.attackerUuid,
    attackerImage: flags.attackerImage,
    targetUuid: flags.targetUuid,
    targetTokenUuid: flags.targetTokenUuid,
    targetImage: flags.targetImage,
    attackerHeaderLabel: game.i18n.localize('dnd35e.ROLL.Attacker'),
    targetHeaderLabel: game.i18n.localize('dnd35e.ROLL.Defender'),
    resultLabel: flags.hit ? game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.Hit') : game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.Miss'),
    hit: flags.hit,
    criticalHit: flags.criticalHit,
    criticalHitLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.CriticalHit'),
    concealmentMissed: flags.concealmentMissed,
    concealedLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.Concealed'),
    concealmentRolled: flags.concealmentRoll !== null,
    concealmentRoll: flags.concealmentRoll,
    concealmentPercent: flags.concealmentPercent,
    concealmentCheckLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.ConcealmentCheck'),
    concealmentRollLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.ConcealmentRoll'),
    concealmentTargetLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.ConcealmentTarget'),
    attackTotal: flags.attackTotal,
    attackTotalLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.AttackTotal'),
    effectiveAcLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.EffectiveAc'),
    effectiveAc: flags.effectiveAc,
    showEffectiveAc: flags.checkMode !== 'noCheck',
    acDetailsLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.AcDetails'),
    acBreakdownHtml: flags.acBreakdown.length > 0
      ? buildRawBreakdownHtml(flags.acBreakdown)
      : '',
    hasDamage: flags.damageTotal !== null,
    resultHeaderLabel: flags.nonLethal
      ? game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.NonLethalDamage')
      : game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.Damage'),
    appliedAmount: flags.appliedAmount,
    damageTotal: flags.damageTotal,
    showHalved: flags.applyHalfDamage,
    halfDamageLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.HalfDamage'),
    // Always visible once there's damage to apply — never hidden post-apply, mirrors the
    // attack card's Apply/Reapply convention so multiple resolvers can redo a messed-up roll.
    showApply: flags.hit && flags.damageTotal !== null,
    applied: flags.applied,
    applyDamageLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.ApplyDamage'),
    reapplyDamageLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.ReapplyDamage'),
    undoLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.Undo'),
    undoneLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.Undone'),
    // Narrowed to the miss/action-economy-refund case now that Apply/Reapply handles the hit
    // path's own reversal — full undo/history hardening is a separate future story.
    showUndo: !flags.hit && flags.actionEconomySpent !== null,
    undone: flags.undone,
    diceRollHtml,
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
  const attackerToken = participantToken(attacker);
  const targetToken = participantToken(target);
  const attackerTokenUuid = attackerToken?.document.uuid ?? null;
  const targetTokenUuid = targetToken?.document.uuid ?? null;

  let appliedAmount = 0;
  if (data.hit && damageRoll) {
    const rawTotal = damageRoll.total ?? 0;
    appliedAmount = data.applyHalfDamage ? Math.floor(rawTotal / 2) : rawTotal;
  }

  const flags: ResolutionCardFlags = {
    ...data,
    attackerHeaderLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.Attacker'),
    targetHeaderLabel: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.Target'),
    attackerUuid: attackerActor.uuid,
    attackerTokenUuid,
    targetUuid: targetActor.uuid,
    targetTokenUuid,
    attackerImage: attackerToken?.document.texture.src ?? attackerActor.img,
    targetImage: targetToken?.document.texture.src ?? targetActor.img,
    damageTotal: damageRoll ? damageRoll.total ?? 0 : null,
    appliedAmount,
    applied: false,
    undone: false,
  };

  const diceRollHtml = damageRoll ? await buildDiceRollHtmlWithModifiers(damageRoll, data.damageModifierList) : '';
  const content = buildResolutionCardContent(flags, diceRollHtml);
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
 * Applies this card's already-computed `appliedAmount` to the target's HP (poc.10 §10.7
 * follow-up) — the explicit, GM/owner-triggered counterpart to the old eager-apply behavior.
 * Left clickable after applying (relabeled Reapply, mirrors the attack card's Apply/Reapply
 * button) so a messed-up resolution can be redone — a repeat click reverses its own prior
 * delta first, keeping repeated clicks idempotent rather than stacking damage. Same
 * rebuild-not-patch convention as `onUndoResolution()`/`onRetarget()`.
 */
async function onApplyDamage(message: ChatMessage, flags: ResolutionCardFlags): Promise<void> {
  if (flags.appliedAmount <= 0) return;

  const target = foundry.utils.fromUuidSync(flags.targetUuid) as ACTORS_DND35E | null;
  if (!target) return;
  const attackerActor = foundry.utils.fromUuidSync(flags.attackerUuid) as ACTORS_DND35E | null;

  if (flags.applied) {
    if (flags.nonLethal) {
      await target.update({ 'system.hp.nonlethal': Math.max(0, target.system.hp.nonlethal - flags.appliedAmount) });
    } else {
      await target.update({ 'system.hp.current': Math.min(target.system.hp.max, target.system.hp.current + flags.appliedAmount) });
    }
  }

  const adjustmentType = flags.nonLethal ? HP_ADJUSTMENT_TYPE.NONLETHAL_ADJUSTMENT : HP_ADJUSTMENT_TYPE.DAMAGE_ADJUSTMENT;
  await target.updateHP(flags.appliedAmount, adjustmentType, { attackerId: attackerActor?.id, damageType: flags.damageType });
  await target.events.emit(ActionLifeCycle.dealDamage, { amount: flags.appliedAmount, damageType: flags.damageType, target });

  const updatedFlags: ResolutionCardFlags = { ...flags, applied: true };
  const roll = message.rolls[0] as DamageRoll | undefined;
  const diceRollHtml = roll
    ? await buildDiceRollHtmlWithModifiers(roll, flags.damageModifierList)
    : '';
  await message.update({
    content: buildResolutionCardContent(updatedFlags, diceRollHtml),
    'flags.dnd35e.resolutionCard': updatedFlags,
  });
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
  if (target && flags.applied && flags.appliedAmount > 0) {
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
      await refundAttackAction(combatant, flags.actionEconomySpent);
      await syncMovementCardSpend(combatant);
      await refundHandBab(combatant, flags.actionEconomySpent.hand, flags.actionEconomySpent.babSpent, attacker);
    }
  }

  const updatedFlags: ResolutionCardFlags = { ...flags, undone: true };
  const roll = message.rolls[0] as DamageRoll | undefined;
  const diceRollHtml = roll ? await buildDiceRollHtmlWithModifiers(roll, flags.damageModifierList) : '';
  await message.update({
    content: buildResolutionCardContent(updatedFlags, diceRollHtml),
    'flags.dnd35e.resolutionCard': updatedFlags,
  });
}

function onExpandAc(html: HTMLElement): void {
  const acDetails = html.querySelector<HTMLElement>('.ac-breakdown');
  if (acDetails) {
    acDetails.classList.toggle('expanded');
  }
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
  if (undoButton) {
    const target = foundry.utils.fromUuidSync(flags.targetUuid) as ActorDnd35e | null;
    if (!target || !(game.user?.isGM || target.isOwner)) {
      undoButton.remove();
      return;
    }
    undoButton.addEventListener('click', () => { void onUndoResolution(message, flags); });
  }

  const applyButton = html.querySelector<HTMLElement>('[data-action="apply-damage"]');
  if (applyButton) {
    const target = foundry.utils.fromUuidSync(flags.targetUuid) as ActorDnd35e | null;
    if (!target || !(game.user?.isGM || target.isOwner)) {
      applyButton.remove();
    } else {
      applyButton.addEventListener('click', () => { void onApplyDamage(message, flags); });
    }
  }

  const expandAcButton = html.querySelector<HTMLElement>('[data-action="expandAc"]');
  if (expandAcButton) {
    expandAcButton.addEventListener('click', () => { onExpandAc(html); });
  }
}

export { buildResolutionCard, wireResolutionCardButton };
export type { ResolutionCardData, ResolutionCardFlags };
