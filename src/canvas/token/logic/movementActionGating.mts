import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { TokenMovementActionConfig } from '@client/_types.mjs';
import { PRONE_CONDITION_ID } from '@constants/conditions.mjs';
import type { SpeedType } from '@constants/speeds.mjs';

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
 * custom entries in `CONFIG.Token.movement.actions`, not spatial movement. Selecting one
 * and confirming a move (even a zero/short drag) applies or removes the Prone condition
 * via `TokenDocumentDnd35e#_onUpdateMovement` inspecting the completed waypoints' `action`.
 * SRD: Drop Prone is a free action; Standing Up is a move action that provokes an AoO —
 * poc.9 has no action-economy system yet, so both are cost-free toggles for now.
 */
const DROP_PRONE_MOVEMENT_ACTION = 'dropProne';
const STAND_UP_MOVEMENT_ACTION = 'standUp';

/** Foundry's built-in ground movement actions, referenced by `TokenDocumentDnd35e#_onUpdateMovement` when auto-switching the movement action after a Prone toggle completes. */
const WALK_MOVEMENT_ACTION = 'walk';
const CRAWL_MOVEMENT_ACTION = 'crawl';

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

/**
 * Builds the `CONFIG.Token.movement.actions.run` config. Modeled on Foundry's own default
 * action configs (walk/jump/etc. in `client/config.mjs`), but written in the fully-resolved
 * `TokenMovementActionConfig` shape rather than Foundry's raw shorthand (`speedMultiplier`/
 * `costMultiplier`/`terrainAction`), since our bundled types describe only the resolved shape.
 * `canSelect` here is a placeholder — `registration.mts` immediately overwrites it via the
 * `SPEED_GATED_ACTIONS` loop.
 */
const buildRunMovementActionConfig = (): TokenMovementActionConfig => ({
  label: 'dnd35e.TOKEN.MOVEMENT.ACTIONS.run.label',
  icon: 'fa-solid fa-person-running',
  order: 0.5,
  teleport: false,
  measure: true,
  walls: 'move',
  visualize: true,
  getAnimationOptions: () => ({ movementSpeed: CONFIG.Token.movement.defaultSpeed * RUN_SPEED_MULTIPLIER }),
  canSelect: () => true,
  deriveTerrainDifficulty: (difficulties) => difficulties.walk,
  getCostFunction: () => (cost) => cost,
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
const buildProneToggleMovementActionConfig = (label: string): TokenMovementActionConfig => ({
  label,
  icon: 'fa-solid fa-person-falling',
  order: 0.6,
  teleport: true,
  measure: true,
  walls: null,
  visualize: false,
  getAnimationOptions: () => ({}),
  canSelect: () => true,
  deriveTerrainDifficulty: () => 0,
  getCostFunction: () => (cost) => cost,
});

const buildDropProneMovementActionConfig = (): TokenMovementActionConfig =>
  buildProneToggleMovementActionConfig('dnd35e.TOKEN.MOVEMENT.ACTIONS.dropProne.label');

const buildStandUpMovementActionConfig = (): TokenMovementActionConfig =>
  buildProneToggleMovementActionConfig('dnd35e.TOKEN.MOVEMENT.ACTIONS.standUp.label');

export {
  buildDropProneMovementActionConfig,
  buildRunMovementActionConfig,
  buildStandUpMovementActionConfig,
  canSelectCrawlMovementAction,
  canSelectDropProneMovementAction,
  canSelectGroundMovementAction,
  canSelectSpeedGatedMovementAction,
  canSelectStandUpMovementAction,
  CRAWL_MOVEMENT_ACTION,
  DISABLED_MOVEMENT_ACTIONS,
  DROP_PRONE_MOVEMENT_ACTION,
  GROUND_MOVEMENT_ACTIONS,
  RUN_MOVEMENT_ACTION,
  RUN_SPEED_MULTIPLIER,
  SPEED_GATED_ACTIONS,
  STAND_UP_MOVEMENT_ACTION,
  WALK_MOVEMENT_ACTION,
};
