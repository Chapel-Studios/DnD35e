/**
 * Attack Roll chat card (poc.10 Story D, §10.8): die face/total, modifier breakdown,
 * unrolled damage-formula preview, and one row per target. The "Change Target(s)" button
 * re-syncs unresolved rows to the user's current `game.user.targets` — Story E adds the
 * "Apply" button/hit-resolution alongside `continueAction()`'s real body.
 *
 * @module
 */
import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { ChatMessageSource } from '@common/documents/chat-message.mjs';
import type { WieldedHand } from '@constants/equipmentSlots.mjs';
import type { AttackActionSpend } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { TokenDocumentDnd35e } from '@documents/scene/tokenDocument/TokenDocumentDnd35e.mjs';
import { canUserSeeActorName } from '@documents/token/logic/tokenNameVisibility.mjs';
import type { Weapon } from '@items/physical/weapon/Weapon.mjs';
import { COMBAT_KEYS } from '@settings/combat/constants.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import type { D20Roll } from '../../D20Roll.mjs';
import type { RollModifier, WeaponDamageRollModifier } from '../../types.mjs';
import { buildDiceRollHtmlWithModifiers, buildModifierBreakdownHtml } from '../modifierBreakdown/modifierBreakdown.mjs';
import { parseActionChainId } from './actionChainSteps.mjs';
import attackRollCardTemplateSource from './attack-roll-card.hbs?raw';

const attackRollCardTemplate = Handlebars.compile(attackRollCardTemplateSource, { preventIndent: true });

/**
 * One target row on the attack card — `resolved` flips true once Story E's hit resolution runs.
 * Only the UUID is persisted (never the name): the display name is resolved per-viewer at render
 * time via `resolveVisibleActorName()`, since a name baked into flags/content would be readable
 * by any client regardless of token name-display permissions.
 */
interface AttackCardTargetRow {
  actorUuid: string;
  /** UUID of the placed token this row was resolved against, if known — see `resolveVisibleActorName()`. */
  tokenUuid: string | null;
  targetImage: string;
  resolved: boolean;
  /** Final hit/miss, set by `_continue()`'s `'damage'` case once this row resolves — `null` until then. */
  hit: boolean | null;
}

/**
 * Persisted in `message.flags.dnd35e.attackCard` — everything needed to re-render the card
 * (Change Target(s)) or, in Story E, resolve the hit. `actionChainId` is `buildActionChainId()`'s
 * composite actor/item/action id (see `actionChainSteps.mts`), letting button handlers resolve
 * back to the live documents without duplicating actor/item/action data onto the flags. Actor
 * names are deliberately not stored here — see `AttackCardTargetRow`'s note.
 */
interface AttackCardFlags {
  /** Authoritative damage snapshot; old cards continue to use their serialized formula. */
  damageModifiers?: WeaponDamageRollModifier[];
  actionChainId: string;
  /** UUID of the placed token that initiated the attack (e.g. via the Token HUD), if known — see `resolveVisibleActorName()`. `null` for callers that never threaded one through. */
  attackerTokenUuid: string | null;
  attackerImage: string;
  weaponName: string;
  hand: WieldedHand;
  nonLethal: boolean;
  /** Unrolled damage formula (STR term included), snapshotted at attack-roll time — actually rolled by Story E's `_continue()`. */
  resolvedDamageFormula: string;
  /** 0-based positions (the Nth damage dice group, left to right) in `resolvedDamageFormula` that must NOT be multiplied on a confirmed crit — normally every AE-contributed "extra damage dice" group (SRD: never multiplied), but an author can invert that default per dice group via the `$critMultiply`/`$critExempt` FormulaFamiliar escape hatches (see `flavorDamageDiceBySource()`/`@constants/critDiceMarkers.mjs`). Passed straight into `DamageRoll#evaluateCritical()`. */
  damageExemptDiceIndices: number[];
  /** Damage-bonus formula term (e.g. `' + 1d6'`), already prefixed with its own sign/operator, or `''` when none was entered. */
  damageBonusTerm: string;
  /** Labeled breakdown (Str modifier, damage situational bonus) for the damage roll's resolution-card tooltip — mirrors `modifierList` below, for damage instead of the attack roll. */
  damageModifierList: RollModifier[];
  /** Pre-roll damage preview breakdown shown on THIS card (before the damage die is ever rolled) — unlike `damageModifierList`, a dice-bearing situational modifier carries its full formula text here (via `RollModifier.formula`) since there's no real roll yet to show dice faces from. */
  expectedDamageModifierList: RollModifier[];
  /** Dice-collapsed "Expected Damage" preview formula (e.g. `2d6 + 7`) — display-only, built by `combineDiceFormula()` from the weapon's own damage dice, the STR term's already-evaluated flat number, and the situational modifier. Never used for the real roll (that stays on `resolvedDamageFormula`/`damageBonusTerm`, which must keep e.g. a wield-mode `floor(x * 1.5)` term as real Roll-evaluable syntax). */
  expectedDamageFormula: string;
  /** Threat range floor (e.g. 19 for a 19–20 weapon) — passed to `roll.isCriticalThreat()` instead of assuming a bare natural 20. */
  critRange: number;
  critMultiplier: number;
  /** Eagerly-rolled confirmation total (poc.10 Story D) — present only when the primary roll threatened a critical; `null` otherwise. Story E compares it against the target's final AC. */
  critConfirmTotal: number | null;
  /** Weapon's damage type (e.g. `slashing`) — needed by `_continue()`'s `'damage'` case to apply/undo HP damage with the right `HpUpdateMetadata.damageType`. */
  damageType: string;
  targets: AttackCardTargetRow[];
  actionEconomySpent: (AttackActionSpend & { hand: WieldedHand; babSpent: number }) | null;
  /** Persisted so the Change Target(s) handler can rebuild `diceRollHtml` without re-deriving the roll's own modifier breakdown. */
  modifierList: RollModifier[];
  /** Already-localized rule-violation notices (insufficient BAB, illegal Wield Mode override) surfaced on the card so the GM notices even if the acting player missed the dialog's live warning. */
  warnings: string[];
}

/**
 * Resolves the name a specific viewer is allowed to see for an actor UUID, mirroring Foundry's
 * token name-display rules (`canUserSeeActorName()`) — used to fill in card names per-client at
 * render time instead of ever persisting a name string on the message. `tokenUuid`, when known,
 * resolves through the exact placed token instead of the actor's ambiguous `token`/`prototypeToken`
 * fallback — a linked actor with multiple placed tokens otherwise loses which one actually attacked.
 */
function resolveVisibleActorName(uuid: string | null | undefined, user: User, tokenUuid?: string | null): string {
  if (!uuid) return '';
  const actor = foundry.utils.fromUuidSync(uuid) as unknown as ACTORS_DND35E | null;
  if (!actor) return '';
  const token = tokenUuid ? foundry.utils.fromUuidSync(tokenUuid) as unknown as TokenDocumentDnd35e | null : null;
  if (!canUserSeeActorName(actor, user, token)) return game.i18n.localize('dnd35e.ROLL.HiddenName');
  return token?.name ?? actor.token?.name ?? actor.name;
}

/** Shared by the initial post and the Change Target(s) click handler's re-render. */
function buildAttackCardContent(roll: D20Roll, flags: AttackCardFlags, diceRollHtml: string): string {
  const primaryTarget = flags.targets[0];
  const attackerUuid = parseActionChainId(flags.actionChainId)?.actorUuid ?? null;
  return attackRollCardTemplate({
    actorImage: flags.attackerImage,
    attackerUuid,
    weaponName: flags.weaponName,
    // Mirrors the Roll Dialog's Attacker/Defender header labels (§10.8 parity).
    attackerHeaderLabel: game.i18n.localize('dnd35e.ROLL.Attacker'),
    targetHeaderLabel: game.i18n.localize('dnd35e.ROLL.Defender'),
    targetImage: primaryTarget?.targetImage ?? '',
    targetUuid: primaryTarget?.actorUuid ?? null,
    targetTokenUuid: primaryTarget?.tokenUuid ?? null,
    resultLabel: game.i18n.localize('dnd35e.ROLL.Result'),
    changeTargetsLabel: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.ChangeTargets'),
    noTargetLabel: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.NoTarget'),
    damagePreviewLabel: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.ExpectedDamage'),
    damagePreviewToggleLabel: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.DamageDetails'),
    nonLethalLabel: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.NonLethal'),
    applyLabel: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.Apply'),
    reapplyLabel: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.Reapply'),
    hitLabel: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.Hit'),
    missLabel: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.Miss'),
    rollFormula: roll.displayFormula,
    total: roll.total ?? 0,
    isFumble: roll.isFumble,
    isCriticalThreat: roll.isCriticalThreat(flags.critRange),
    confirmCriticalLabel: game.i18n.localize('dnd35e.ROLL.ATTACK_CARD.ConfirmCritical'),
    hasCritConfirm: flags.critConfirmTotal !== null,
    critConfirmTotal: flags.critConfirmTotal,
    diceRollHtml,
    damageFormulaDisplay: flags.expectedDamageFormula,
    // Hides the whole box rather than just the breakdown when there's genuinely no damage —
    // `combineDiceFormula()` (which builds `expectedDamageFormula`) falls back to the string `'0'`
    // rather than an empty string when nothing contributes.
    hasDamagePreview: flags.expectedDamageFormula !== '' && flags.expectedDamageFormula !== '0',
    damagePreviewBreakdownHtml: buildModifierBreakdownHtml(flags.expectedDamageModifierList),
    hasDamagePreviewBreakdown: flags.expectedDamageModifierList.length > 0,
    critMultiplier: flags.critMultiplier,
    nonLethal: flags.nonLethal,
    targets: flags.targets,
    warnings: flags.warnings,
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
 * Patches in additional warnings discovered after the card was already posted (poc.10 §10.8
 * review fix) — `_canExecute()`'s pre-check warnings (already-localized, e.g. `noTargets`/
 * `tooManyTargets`) aren't merged onto the action result until `executeAction()`'s
 * caller runs, which is after `_executeCheck()` has already built and posted this card via
 * `buildAttackCard()` with only its own wield-mode warnings. `WeaponAttackDataModel._postExecute()`
 * calls this once the merged result is known. `content` is rebuilt (not flags-only) since
 * `warnings` is baked into the static `content` HTML at build time, same as `onRetarget()`.
 */
async function appendAttackCardWarnings(message: ChatMessage, additionalWarnings: string[]): Promise<void> {
  if (additionalWarnings.length === 0) return;
  const flags = message.getFlag(SYSTEM_ID, 'attackCard') as AttackCardFlags | undefined;
  if (!flags) return;

  const updatedFlags: AttackCardFlags = { ...flags, warnings: [...flags.warnings, ...additionalWarnings] };
  const roll = message.rolls[0] as D20Roll;
  const diceRollHtml = await buildDiceRollHtmlWithModifiers(roll, flags.modifierList);
  await message.update({
    content: buildAttackCardContent(roll, updatedFlags, diceRollHtml),
    'flags.dnd35e.attackCard': updatedFlags,
  });
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
    .map(token => ({
      actorUuid: token.actor!.uuid,
      tokenUuid: token.document.uuid,
      targetImage: token.actor!.img ?? '',
      resolved: false,
      hit: null,
    }));
  const updatedFlags: AttackCardFlags = { ...flags, targets: [...resolvedRows, ...newRows] };

  const roll = message.rolls[0] as D20Roll;
  const diceRollHtml = await buildDiceRollHtmlWithModifiers(roll, flags.modifierList);
  await message.update({
    content: buildAttackCardContent(roll, updatedFlags, diceRollHtml),
    'flags.dnd35e.attackCard': updatedFlags,
  });
}

/**
 * Flips one target row to `resolved`/`hit` on the attack card (poc.10 Story E, §10.7) — called
 * by `WeaponAttackDataModel#continue()`'s `'damage'` case once `evaluateDefense()` decides the
 * outcome. Same rebuild-not-patch convention as `onRetarget()`/`appendAttackCardWarnings()`.
 */
async function markTargetRowResolved(message: ChatMessage, flags: AttackCardFlags, targetUuid: string, hit: boolean): Promise<void> {
  const updatedTargets = flags.targets.map(row => (
    row.actorUuid === targetUuid ? { ...row, resolved: true, hit } : row
  ));
  const updatedFlags: AttackCardFlags = { ...flags, targets: updatedTargets };

  const roll = message.rolls[0] as D20Roll;
  const diceRollHtml = await buildDiceRollHtmlWithModifiers(roll, flags.modifierList);
  await message.update({
    content: buildAttackCardContent(roll, updatedFlags, diceRollHtml),
    'flags.dnd35e.attackCard': updatedFlags,
  });
}

/**
 * Fills in the attacker/target name(s) into the card's static, shared `content` HTML for the
 * CURRENT viewer only (poc.10 Story D follow-up) — no name is ever persisted in `content` or
 * the flags (both are one string/object shared by every client), so this must resolve and
 * write the correct per-viewer name at actual render time rather than redacting a baked-in one.
 */
function populateActorNames(message: ChatMessage, html: HTMLElement): void {
  const flags = message.getFlag(SYSTEM_ID, 'attackCard') as AttackCardFlags | undefined;
  if (!flags) return;

  const setName = (el: HTMLElement | null, uuid: string | undefined, tokenUuid?: string | null): void => {
    if (!el) return;
    el.textContent = resolveVisibleActorName(uuid, game.user, tokenUuid);
  };

  const attackerUuid = parseActionChainId(flags.actionChainId)?.actorUuid;
  setName(html.querySelector<HTMLElement>('[data-attacker-uuid]'), attackerUuid, flags.attackerTokenUuid);
  setName(html.querySelector<HTMLElement>('.actor-info.target [data-target-uuid]'), flags.targets[0]?.actorUuid, flags.targets[0]?.tokenUuid);
  html.querySelectorAll<HTMLElement>('.target-row .target-name').forEach((el) => {
    setName(el, el.dataset.targetUuid, el.dataset.targetTokenUuid);
  });
}

/**
 * Resolves back to the exact action instance that fired this attack (via the card's stored
 * `actionChainId`) and hands off to its own `continueAction()` (poc.10 Story E, §10.7) — the
 * click handler never looks anything up in a step registry, and never decides hit/miss
 * itself; that's entirely `continueAction()`'s job (permission gating included). Generic/ungated
 * on purpose: a future action type with a different `_continue()` body needs no changes here.
 */
async function advanceActionChain(message: ChatMessage, flags: AttackCardFlags, targetUuid: string): Promise<void> {
  const row = flags.targets.find(t => t.actorUuid === targetUuid);
  if (!row) return;

  const parsed = parseActionChainId(flags.actionChainId);
  if (!parsed) return;
  const item = foundry.utils.fromUuidSync(parsed.itemUuid) as Weapon | null;
  const action = item?.system.actions.find(a => a._id === parsed.actionId);
  if (!action) return; // the acting item/action no longer exists (deleted since the card posted)

  const stepId = action.chain[0]?.actionId ?? 'damage';
  await action.continueAction(stepId, message, row.actorUuid);
}

/** Mirrors `onExpandAc()` in resolutionCard.mts — toggles `.expanded` on the breakdown itself, not the clicked summary row. */
function onExpandDamagePreview(html: HTMLElement): void {
  const breakdown = html.querySelector<HTMLElement>('.damage-preview-breakdown');
  if (breakdown) breakdown.classList.toggle('expanded');
}

/** Wires the "Change Target(s)" button and each target row's "Apply"/"Reapply" button — see registerChatCardActions.mts. */
function wireAttackRollCardButton(message: ChatMessage, html: HTMLElement): void {
  populateActorNames(message, html);

  const expandDamagePreviewButton = html.querySelector<HTMLElement>('[data-action="expandDamagePreview"]');
  if (expandDamagePreviewButton) {
    expandDamagePreviewButton.addEventListener('click', () => { onExpandDamagePreview(html); });
  }

  const flags = message.getFlag(SYSTEM_ID, 'attackCard') as AttackCardFlags | undefined;
  const parsed = flags ? parseActionChainId(flags.actionChainId) : null;
  const attacker = parsed ? foundry.utils.fromUuidSync(parsed.actorUuid) as ActorDnd35e | null : null;

  const retargetButton = html.querySelector<HTMLElement>('[data-action="retarget"]');
  if (retargetButton) {
    if (!flags || !attacker || !(game.user?.isGM || attacker.isOwner)) {
      retargetButton.remove();
    } else {
      retargetButton.addEventListener('click', () => { void onRetarget(message, flags); });
    }
  }

  if (!flags) return;
  const playerSelfDefense = !!game.settings.get(SYSTEM_ID, COMBAT_KEYS.PLAYER_SELF_DEFENSE);
  html.querySelectorAll<HTMLElement>('[data-action="apply-attack"]').forEach((button) => {
    const targetUuid = button.dataset.targetUuid;
    const target = targetUuid ? foundry.utils.fromUuidSync(targetUuid) as ActorDnd35e | null : null;
    // Hidden entirely for anyone who can't resolve this target's defense right now — `continueAction()`
    // re-checks the same rule (defense-in-depth for any other future caller of that method).
    if (!target || !(game.user?.isGM || (playerSelfDefense && target.isOwner))) {
      button.remove();
      return;
    }
    button.addEventListener('click', () => { void advanceActionChain(message, flags, targetUuid!); });
  });
}

export { advanceActionChain, appendAttackCardWarnings, buildAttackCard, buildAttackCardContent, markTargetRowResolved, resolveVisibleActorName, wireAttackRollCardButton };
export type { AttackCardFlags, AttackCardTargetRow };
