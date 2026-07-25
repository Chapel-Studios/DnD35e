import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { SpeedType } from '@constants/speeds.mjs';

import { RUN_MOVEMENT_ACTION, RUN_SPEED_MULTIPLIER } from './movementActionGating.mjs';

/**
 * Maps a Foundry `CONFIG.Token.movement.actions` key to the matching `system.speed`
 * field. `crawl` and `run` have no dedicated speed of their own — `crawl` is a
 * fraction of land speed while prone, `run` is a multiple of it (see
 * `ACTION_SPEED_MULTIPLIER`) — so both map to `land`. Actions with no speed concept
 * (`jump`, `blink`, `displace`) are intentionally unmapped — they're disabled
 * outright via `canSelect` (see registration.mts / WISHLIST.md), so a waypoint
 * should never carry them, but `getMovementBudget` still degrades safely to 0
 * rather than a wrong land-speed value.
 */
const ACTION_TO_SPEED_KEY: Partial<Record<string, SpeedType>> = {
  walk: 'land',
  [RUN_MOVEMENT_ACTION]: 'land',
  crawl: 'land',
  fly: 'fly',
  swim: 'swim',
  burrow: 'burrow',
  climb: 'climb',
};

/**
 * Multiplier applied to the mapped speed field for actions that cover ground faster
 * or slower than a 1:1 walk of that speed (e.g. running is 4x land speed per the SRD).
 * Actions absent from this map use a multiplier of 1.
 */
const ACTION_SPEED_MULTIPLIER: Partial<Record<string, number>> = {
  [RUN_MOVEMENT_ACTION]: RUN_SPEED_MULTIPLIER,
};

/**
 * The token's movement budget in grid units for poc.9's ruler visualization —
 * sourced from the actor's speed field matching the waypoint's movement action
 * (e.g. `walk` → `system.speed.land`, `fly` → `system.speed.fly`, `run` → 4x
 * `system.speed.land`).
 */
const getMovementBudget = (actor: ActorDnd35e | null | undefined, action: string): number => {
  const speedKey = ACTION_TO_SPEED_KEY[action];
  if (!speedKey) return 0;
  const baseSpeed = actor?.system?.speed?.[speedKey] ?? 0;
  const multiplier = ACTION_SPEED_MULTIPLIER[action] ?? 1;
  return baseSpeed * multiplier;
};

/**
 * Whether a cumulative movement cost exceeds the actor's movement budget.
 * Used to color ruler waypoints/segments red once a drag exceeds available speed.
 */
const isOverBudget = (cumulativeCost: number, budget: number): boolean => cumulativeCost > budget;

export { getMovementBudget, isOverBudget };
