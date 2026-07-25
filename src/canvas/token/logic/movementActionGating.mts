import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { TokenMovementActionConfig } from '@client/_types.mjs';
import type { SpeedType } from '@constants/speeds.mjs';

/**
 * The dnd35e-specific "run" movement action — not one of Foundry's built-in defaults.
 * SRD running: move up to 4x land speed, but only in a straight line (see WISHLIST.md /
 * phase-09-basic-tokens.md "Movement Action Gating"). Registered in `registration.mts`;
 * the straight-line constraint is enforced by `TokenDnd35e#_addDragWaypoint` refusing to
 * add intermediate waypoints while this action is active.
 */
const RUN_MOVEMENT_ACTION = 'run';

/** Multiplier applied to land speed for the `run` movement action's animation playback. */
const RUN_SPEED_MULTIPLIER = 4;

/**
 * Movement actions gated on a matching `system.speed` field being > 0. Only actions
 * with a clean 1:1 mapping to a persisted speed are eligible for this gate — see
 * "Movement Action Gating" in phase-09-basic-tokens.md for why crawl/jump/
 * blink/displace are handled separately (disabled outright, not speed-gated).
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
 * (skill checks, prone condition, spell-granted teleport — tracked in WISHLIST.md).
 */
const DISABLED_MOVEMENT_ACTIONS = [ 'crawl', 'jump', 'blink', 'displace'] as const;

/**
 * Whether the given actor's persisted speed supports the given movement action.
 * Used to gate `CONFIG.Token.movement.actions.<action>.canSelect` for fly/swim/burrow/run.
 */
const canSelectSpeedGatedMovementAction = (actor: ActorDnd35e | null | undefined, action: string): boolean => {
  const speedKey = SPEED_GATED_ACTIONS[action];
  if (!speedKey) return false;
  return (actor?.system?.speed?.[speedKey] ?? 0) > 0;
};

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

export {
  buildRunMovementActionConfig,
  canSelectSpeedGatedMovementAction,
  DISABLED_MOVEMENT_ACTIONS,
  RUN_MOVEMENT_ACTION,
  RUN_SPEED_MULTIPLIER,
  SPEED_GATED_ACTIONS,
};
