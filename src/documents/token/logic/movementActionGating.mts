import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { TokenMovementActionConfig } from '@client/_types.mjs';
import { PRONE_CONDITION_ID } from '@constants/conditions.mjs';
import type { SpeedType } from '@constants/speeds.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { getMovementSession } from '@documents/combat/combatant/movementSession.mjs';

/**
 * Foundry's `TokenMovementActionConfig` has no concept of provoking an attack of
 * opportunity — `provokes` is a system-only extension, read by the movement-action HUD
 * caution badge (§10.6/§10.10) and nowhere in core. Every config built by this module
 * populates it directly; `registration.mts` casts to this type when backfilling it onto
 * Foundry's own built-in `walk` config.
 */
interface Dnd35eMovementActionConfig extends TokenMovementActionConfig {
  provokes: boolean;
}

/**
 * The dnd35e-specific "run" movement action — not one of Foundry's built-in defaults.
 * SRD running: move up to 4x land speed, but only in a straight line (see WISHLIST.md /
 * poc/phase-09-basic-tokens.md "Movement Action Gating"). Registered in `registration.mts`;
 * the straight-line constraint is enforced by `TokenDnd35e#_addDragWaypoint` refusing to
 * add intermediate waypoints while this action is active.
 */
const RUN_MOVEMENT_ACTION = 'run';

/** Multiplier applied to land speed for the `run` movement action's animation playback. */
const RUN_SPEED_MULTIPLIER = 4;

/**
 * The dnd35e-specific "Drop Prone" and "Stand Up" movement actions — modeled on `run`:
 * custom entries in `CONFIG.Token.movement.actions`, not spatial movement. Clicking either
 * one directly toggles the Prone condition (see `proneToggle.mts`'s `applyProneToggle()`) —
 * no confirming drag anymore. SRD: Drop Prone is a free action; Standing Up is a move action
 * that provokes an AoO — `TokenHudDnd35e#onMovementAction` spends the move action (only
 * while a combat is active; free outside combat, same as other combat-only mechanics) before
 * toggling, and `proneToggleCard.mts`'s Undo button refunds it.
 */
const DROP_PRONE_MOVEMENT_ACTION = 'dropProne';
const STAND_UP_MOVEMENT_ACTION = 'standUp';

/** Foundry's built-in ground movement actions, referenced by `TokenDocumentDnd35e#_onUpdateMovement` when auto-switching the movement action after a Prone toggle completes. */
const WALK_MOVEMENT_ACTION = 'walk';
const CRAWL_MOVEMENT_ACTION = 'crawl';

/**
 * poc.10 Story B's three new custom movement actions (see phase-10-basic-combat.md §10.6).
 * All three are combat-only — gated below on `game.combat?.started` plus the acting
 * combatant's remaining action economy, same pattern as `run`/`dropProne`/`standUp`.
 */
const FIVE_FOOT_STEP_MOVEMENT_ACTION = 'fiveFootStep';
const WITHDRAW_MOVEMENT_ACTION = 'withdraw';
const CHARGE_MOVEMENT_ACTION = 'charge';

/**
 * A fourth combat-only movement action: a full-round action spending both move and standard
 * for 2x land speed, same shape as `withdraw` but without withdraw's AoO-immunity benefit —
 * ordinary movement rules (provokes) apply. Not part of the original §10.6 spec; added per
 * user request alongside the Story B bugfix pass.
 */
const DOUBLE_MOVE_MOVEMENT_ACTION = 'doubleMove';

/**
 * Movement actions gated on a matching `system.speed` field being > 0. Only actions
 * with a clean 1:1 mapping to a persisted speed are eligible for this gate — see
 * "Movement Action Gating" in poc/phase-09-basic-tokens.md for why jump/blink/displace
 * are handled separately (disabled outright, not speed-gated). `crawl`/`walk`/`run`
 * are gated on the Prone condition instead — see `canSelectCrawlMovementAction`/
 * `canSelectGroundMovementAction` below.
 */
const SPEED_GATED_ACTIONS: Partial<Record<string, SpeedType>> = {
  climb: 'climb',
  fly: 'fly',
  swim: 'swim',
  burrow: 'burrow',
  [RUN_MOVEMENT_ACTION]: 'land',
};

/**
 * Movement actions disabled outright until their prerequisite systems exist
 * (skill checks, spell-granted teleport — tracked in WISHLIST.md).
 */
const DISABLED_MOVEMENT_ACTIONS = [ 'jump', 'blink', 'displace'] as const;

/** Ground movement actions blocked while Prone — a prone creature can only crawl or stand up. */
const GROUND_MOVEMENT_ACTIONS = [ WALK_MOVEMENT_ACTION, RUN_MOVEMENT_ACTION] as const;

/** Whether the given actor currently has the Prone condition (see `ActorDnd35e.applyActiveEffects()` populating `actor.statuses`). */
const hasProneCondition = (actor: ActorDnd35e | null | undefined): boolean =>
  actor?.statuses?.has(PRONE_CONDITION_ID) ?? false;

/**
 * Whether the given actor's persisted speed supports the given movement action.
 * Used to gate `CONFIG.Token.movement.actions.<action>.canSelect` for fly/swim/burrow/run.
 */
const canSelectSpeedGatedMovementAction = (actor: ActorDnd35e | null | undefined, action: string): boolean => {
  const speedKey = SPEED_GATED_ACTIONS[action];
  if (!speedKey) return false;
  return (actor?.system?.speed?.[speedKey] ?? 0) > 0;
};

/** `crawl` is only selectable while Prone (SRD: crawling is a prone-only movement mode). */
const canSelectCrawlMovementAction = (actor: ActorDnd35e | null | undefined): boolean => hasProneCondition(actor);

/** `walk`/`run` are not selectable while Prone — must crawl or stand up instead. */
const canSelectGroundMovementAction = (actor: ActorDnd35e | null | undefined): boolean => !hasProneCondition(actor);

/** `dropProne` only makes sense when not already Prone. */
const canSelectDropProneMovementAction = (actor: ActorDnd35e | null | undefined): boolean => !hasProneCondition(actor);

/** `standUp` only makes sense while Prone. */
const canSelectStandUpMovementAction = (actor: ActorDnd35e | null | undefined): boolean => hasProneCondition(actor);

/** `fiveFootStep`/`withdraw`/`charge` are all combat-only — none of them make sense outside a turn structure. */
const isInActiveCombat = (): boolean => game.combat?.started ?? false;

const getCombatantForActor = (actor: ActorDnd35e | null | undefined): CombatantDnd35e | undefined =>
  actor ? (game.combat?.getCombatantsByActor(actor.id)[0] as CombatantDnd35e | undefined) : undefined;

/**
 * A 5-foot step only makes sense during an active encounter — combat-only, same as
 * `withdraw`/`charge`/`doubleMove` below. This is deliberately a *structural* applicability
 * check only (hides the option outright, via Foundry's `canSelect`) — whether one is
 * currently *affordable* (nothing moved yet this turn) is a separate, moment-to-moment concern
 * handled by `isFiveFootStepAffordable()`/`movementActionHudDecoration.mts`, since Foundry's
 * `canSelect` has no "disabled but visible" state, only hide/show (verified against the real
 * client source — `TokenHUD#_getMovementActionChoices()` `continue`s outright on a falsy
 * `canSelect`). Collapsing both concerns into `canSelect` would make an option a combatant
 * could use later this turn (once its action economy resets) disappear from the menu entirely
 * instead of showing as disabled.
 */
const canSelectFiveFootStepMovementAction = (): boolean => isInActiveCombat();

/** Withdraw is a full-round action — combat-only structurally; affordability is handled separately (see `canSelectFiveFootStepMovementAction()`'s comment). */
const canSelectWithdrawMovementAction = (): boolean => isInActiveCombat();

/** Charge is a full-round action — same shape as `canSelectWithdrawMovementAction()`. */
const canSelectChargeMovementAction = (): boolean => isInActiveCombat();

/** Double Move is a full-round action — same shape as `canSelectWithdrawMovementAction()`. */
const canSelectDoubleMoveMovementAction = (): boolean => isInActiveCombat();

/** `run` is ordinary movement using the move-action pool — structurally, it only needs the existing speed/Prone gates; affordability is handled separately. */

/**
 * A 5-foot step is only *affordable* while nothing has moved yet this turn — checked against
 * the movement session (`movementSession.mts`), not just the raw `move` action pool, since the
 * pool alone can't distinguish "never moved" from "already used a 5-foot step" or block a
 * later normal move from following one (SRD: the two are mutually exclusive for the round).
 */
const isFiveFootStepAffordable = (actor: ActorDnd35e | null | undefined): boolean => {
  const combatant = getCombatantForActor(actor);
  if (!combatant) return true;
  return getMovementSession(combatant).category === null;
};

/** `run` is ordinary movement — only affordable while the move action (and this turn's movement category) is still available. */
const isRunAffordable = (actor: ActorDnd35e | null | undefined): boolean => {
  const combatant = getCombatantForActor(actor);
  if (!combatant) return true;
  const session = getMovementSession(combatant);
  return combatant.actionEconomy.actions.move && session.category !== 'step';
};

/** `withdraw`/`charge`/`doubleMove` are full-round actions — only affordable while both the move and standard actions are still unspent (and this turn hasn't been locked into a 5-foot-step-only session). */
const isFullRoundMoveAffordable = (actor: ActorDnd35e | null | undefined): boolean => {
  const combatant = getCombatantForActor(actor);
  if (!combatant) return true;
  const session = getMovementSession(combatant);
  return combatant.actionEconomy.actions.move && combatant.actionEconomy.actions.standard && session.category !== 'step';
};

/** `standUp` costs a move action (SRD) — only affordable in combat while the move action pool is still available; free/always-affordable outside combat, mirroring `TokenHudDnd35e#onMovementAction`'s own no-combatant skip. */
const isStandUpAffordable = (actor: ActorDnd35e | null | undefined): boolean => {
  const combatant = getCombatantForActor(actor);
  if (!combatant) return true;
  return combatant.actionEconomy.actions.move;
};

/**
 * Per-action affordability predicates, read by `movementActionHudDecoration.mts` to grey out
 * (not hide) movement-action HUD entries the combatant can't currently use. Actions absent
 * from this map (`walk`/`crawl`/`dropProne`/fly/swim/climb/burrow) are always considered
 * affordable once structurally selectable — walk/crawl remain selectable regardless of
 * remaining action economy by design.
 */
const MOVEMENT_ACTION_AFFORDABILITY: Partial<Record<string, (actor: ActorDnd35e | null | undefined) => boolean>> = {
  [RUN_MOVEMENT_ACTION]: isRunAffordable,
  [FIVE_FOOT_STEP_MOVEMENT_ACTION]: isFiveFootStepAffordable,
  [WITHDRAW_MOVEMENT_ACTION]: isFullRoundMoveAffordable,
  [CHARGE_MOVEMENT_ACTION]: isFullRoundMoveAffordable,
  [DOUBLE_MOVE_MOVEMENT_ACTION]: isFullRoundMoveAffordable,
  [STAND_UP_MOVEMENT_ACTION]: isStandUpAffordable,
};

/** Whether the given movement action, already offered (structurally applicable), is currently affordable given the actor's remaining action economy this turn. */
const isMovementActionAffordable = (actor: ActorDnd35e | null | undefined, action: string): boolean =>
  (MOVEMENT_ACTION_AFFORDABILITY[action] ?? (() => true))(actor);



/**
 * Builds the `CONFIG.Token.movement.actions.run` config. Modeled on Foundry's own default
 * action configs (walk/jump/etc. in `client/config.mjs`), but written in the fully-resolved
 * `TokenMovementActionConfig` shape rather than Foundry's raw shorthand (`speedMultiplier`/
 * `costMultiplier`/`terrainAction`), since our bundled types describe only the resolved shape.
 * `canSelect` here is a placeholder — `registration.mts` immediately overwrites it via the
 * `SPEED_GATED_ACTIONS` loop.
 */
const buildRunMovementActionConfig = (): Dnd35eMovementActionConfig => ({
  label: 'dnd35e.TOKEN.MOVEMENT.ACTIONS.run.label',
  icon: 'fa-solid fa-person-running',
  order: 0.5,
  teleport: false,
  measure: true,
  walls: 'move',
  visualize: true,
  provokes: true,
  getAnimationOptions: () => ({ movementSpeed: CONFIG.Token.movement.defaultSpeed * RUN_SPEED_MULTIPLIER }),
  canSelect: () => true,
  deriveTerrainDifficulty: (difficulties) => difficulties.walk,
  getCostFunction: () => (cost) => cost,
});

/**
 * Shared config for the combat-only `fiveFootStep`/`withdraw`/`charge` actions —
 * ordinary spatial movement (unlike `buildProneToggleMovementActionConfig`'s teleport/
 * snap-back actions), so it's modeled directly on `buildRunMovementActionConfig` rather
 * than the Prone-toggle shape. `speedMultiplier` doubles the animation playback speed for
 * `withdraw`/`charge` (1 for `fiveFootStep`, which doesn't double anything).
 * `canSelect`/`provokes` are placeholders — `registration.mts` overwrites both.
 */
const buildCombatMovementActionConfig = (label: string, icon: string, order: number, speedMultiplier: number): Dnd35eMovementActionConfig => ({
  label,
  icon,
  order,
  teleport: false,
  measure: true,
  walls: 'move',
  visualize: true,
  provokes: false,
  getAnimationOptions: () => ({ movementSpeed: CONFIG.Token.movement.defaultSpeed * speedMultiplier }),
  canSelect: () => true,
  deriveTerrainDifficulty: (difficulties) => difficulties.walk,
  getCostFunction: () => (cost) => cost,
});

const buildFiveFootStepMovementActionConfig = (): Dnd35eMovementActionConfig =>
  buildCombatMovementActionConfig('dnd35e.TOKEN.MOVEMENT.ACTIONS.fiveFootStep.label', 'fa-solid fa-shoe-prints', 0.51, 1);

const buildWithdrawMovementActionConfig = (): Dnd35eMovementActionConfig =>
  buildCombatMovementActionConfig('dnd35e.TOKEN.MOVEMENT.ACTIONS.withdraw.label', 'fa-solid fa-person-walking-arrow-right', 0.52, 2);

const buildChargeMovementActionConfig = (): Dnd35eMovementActionConfig => ({
  ...buildCombatMovementActionConfig('dnd35e.TOKEN.MOVEMENT.ACTIONS.charge.label', 'fa-solid fa-person-running-fast', 0.53, 2),
  provokes: true,
});

/** Double Move: full-round action, 2x land speed, ordinary movement rules (provokes) apply — unlike Withdraw. */
const buildDoubleMoveMovementActionConfig = (): Dnd35eMovementActionConfig => ({
  ...buildCombatMovementActionConfig('dnd35e.TOKEN.MOVEMENT.ACTIONS.doubleMove.label', 'fa-solid fa-forward-fast', 0.54, 2),
  provokes: true,
});

/**
 * Shared config for `dropProne`/`standUp` — neither represents spatial movement, but
 * still requires a real confirming drag to produce a waypoint (Foundry has no "instant
 * action" hook, only completed-movement waypoints — see
 * `TokenDocumentDnd35e#_onUpdateMovement`, which also snaps the token back to its
 * origin once the confirming drag lands, since neither action actually covers ground).
 * `teleport: true` skips wall-blocking for that confirming drag.
 *
 * Deliberately does NOT set `measure: false`. Foundry's own bootstrap hard-validates
 * that combo exclusively for the reserved `displace` action id (`config.measure !==
 * false` throws for `CONFIG.Token.movement.actions.displace` specifically — see
 * `foundry.mjs`'s `_initializeMovementActions`), and every other built-in teleport-style
 * action Foundry ships (`blink`) leaves `measure` at its default (`true`). `displace` is
 * also the one Foundry itself marks `canSelect: false` — i.e. never user-selectable/
 * draggable. `measure: false` here reproduced that same non-interactive combo and
 * silently broke dragging entirely (no ruler, no waypoint, no visible response). Setting
 * `measure: true` (Foundry's own default for every other action) restores normal
 * drag/ruler feedback.
 *
 * `getCostFunction` is always free (`0`) — an attempt to cap the confirming drag at one
 * grid square (via segment-counting cost-function tricks) produced no visible effect in
 * practice, so that idea was dropped. The confirming drag can be any length; only the
 * fact that *a* waypoint with this action landed matters to
 * `TokenDocumentDnd35e#_onUpdateMovement`, which always snaps the token back to
 * `movement.origin` afterward regardless of how far the drag went.
 *
 * `canSelect` here is a placeholder — `registration.mts` overwrites it with the
 * Prone-gated checks.
 */
const buildProneToggleMovementActionConfig = (label: string, provokes: boolean): Dnd35eMovementActionConfig => ({
  label,
  icon: 'fa-solid fa-person-falling',
  order: 0.6,
  teleport: true,
  measure: true,
  walls: null,
  visualize: false,
  provokes,
  getAnimationOptions: () => ({}),
  canSelect: () => true,
  deriveTerrainDifficulty: () => 0,
  getCostFunction: () => (cost) => cost,
});

// SRD: dropping prone is a free action (no AoO); standing up is a move action that provokes.
const buildDropProneMovementActionConfig = (): Dnd35eMovementActionConfig =>
  buildProneToggleMovementActionConfig('dnd35e.TOKEN.MOVEMENT.ACTIONS.dropProne.label', false);

const buildStandUpMovementActionConfig = (): Dnd35eMovementActionConfig =>
  buildProneToggleMovementActionConfig('dnd35e.TOKEN.MOVEMENT.ACTIONS.standUp.label', true);

export {
  buildChargeMovementActionConfig,
  buildDoubleMoveMovementActionConfig,
  buildDropProneMovementActionConfig,
  buildFiveFootStepMovementActionConfig,
  buildRunMovementActionConfig,
  buildStandUpMovementActionConfig,
  buildWithdrawMovementActionConfig,
  canSelectChargeMovementAction,
  canSelectCrawlMovementAction,
  canSelectDoubleMoveMovementAction,
  canSelectDropProneMovementAction,
  canSelectFiveFootStepMovementAction,
  canSelectGroundMovementAction,
  canSelectSpeedGatedMovementAction,
  canSelectStandUpMovementAction,
  canSelectWithdrawMovementAction,
  CHARGE_MOVEMENT_ACTION,
  CRAWL_MOVEMENT_ACTION,
  DISABLED_MOVEMENT_ACTIONS,
  DOUBLE_MOVE_MOVEMENT_ACTION,
  DROP_PRONE_MOVEMENT_ACTION,
  FIVE_FOOT_STEP_MOVEMENT_ACTION,
  GROUND_MOVEMENT_ACTIONS,
  hasProneCondition,
  isFiveFootStepAffordable,
  isFullRoundMoveAffordable,
  isMovementActionAffordable,
  isRunAffordable,
  isStandUpAffordable,
  RUN_MOVEMENT_ACTION,
  RUN_SPEED_MULTIPLIER,
  SPEED_GATED_ACTIONS,
  STAND_UP_MOVEMENT_ACTION,
  WALK_MOVEMENT_ACTION,
  WITHDRAW_MOVEMENT_ACTION,
};

export type { Dnd35eMovementActionConfig };

