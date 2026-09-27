import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { SpeedType } from '@constants/speeds.mjs';
import { SPEED_TYPE } from '@constants/speeds.mjs';

import {
  CHARGE_MOVEMENT_ACTION,
  CRAWL_MOVEMENT_ACTION,
  DOUBLE_MOVE_MOVEMENT_ACTION,
  FIVE_FOOT_STEP_MOVEMENT_ACTION,
  RUN_MOVEMENT_ACTION,
  RUN_SPEED_MULTIPLIER,
  WITHDRAW_MOVEMENT_ACTION,
} from './movementActionGating.mjs';

/**
 * Maps a Foundry `CONFIG.Token.movement.actions` key to the matching `system.speed`
 * field. `run` has no dedicated speed of its own — it's a multiple of land speed (see
 * `ACTION_SPEED_MULTIPLIER`). `crawl` maps to `land` too — the Prone condition caps
 * `system.speed.land` at a flat 5 ft. via an OVERRIDE change (see `conditions.mts`), so
 * reading land speed directly already yields the correct SRD crawl distance. `charge`/
 * `withdraw` also map to `land` — both double it via `ACTION_SPEED_MULTIPLIER` (SRD:
 * both cover twice normal speed). Actions with no speed concept (`jump`, `blink`,
 * `displace`, `dropProne`, `standUp`, `fiveFootStep` — a flat 1-square allowance handled
 * directly by `TokenDocumentDnd35e#_onUpdateMovement`, not this budget map) are
 * unmapped — they're disabled/non-spatial via `canSelect` (see registration.mts /
 * WISHLIST.md), so a waypoint should never carry them, but `getMovementBudget` still
 * degrades safely to 0 rather than a wrong land-speed value.
 */
const ACTION_TO_SPEED_KEY: Partial<Record<string, SpeedType | typeof CRAWL_MOVEMENT_ACTION>> = {
  walk: SPEED_TYPE.LAND,
  [RUN_MOVEMENT_ACTION]: SPEED_TYPE.LAND,
  [FIVE_FOOT_STEP_MOVEMENT_ACTION]: CRAWL_MOVEMENT_ACTION,
  [CRAWL_MOVEMENT_ACTION]: CRAWL_MOVEMENT_ACTION,
  [CHARGE_MOVEMENT_ACTION]: SPEED_TYPE.LAND,
  [WITHDRAW_MOVEMENT_ACTION]: SPEED_TYPE.LAND,
  [DOUBLE_MOVE_MOVEMENT_ACTION]: SPEED_TYPE.LAND,
  fly: SPEED_TYPE.FLY,
  swim: SPEED_TYPE.SWIM,
  burrow: SPEED_TYPE.BURROW,
  climb: SPEED_TYPE.CLIMB,
};

/**
 * Multiplier applied to the mapped speed field for actions that cover ground faster
 * or slower than a 1:1 walk of that speed (e.g. running is 4x land speed per the SRD).
 * Actions absent from this map use a multiplier of 1.
 */
const ACTION_SPEED_MULTIPLIER: Partial<Record<string, number>> = {
  [RUN_MOVEMENT_ACTION]: RUN_SPEED_MULTIPLIER,
  [CHARGE_MOVEMENT_ACTION]: 2,
  [WITHDRAW_MOVEMENT_ACTION]: 2,
  [DOUBLE_MOVE_MOVEMENT_ACTION]: 2,
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
  if (speedKey === CRAWL_MOVEMENT_ACTION) return 1;

  const baseSpeed = actor?.system?.speed?.[speedKey] ?? 0;
  const multiplier = ACTION_SPEED_MULTIPLIER[action] ?? 1;
  return baseSpeed * multiplier;
};

/**
 * Whether a cumulative movement cost exceeds the actor's movement budget.
 * Used to color ruler waypoints/segments red once a drag exceeds available speed.
 */
const isOverBudget = (cumulativeCost: number, budget: number): boolean => cumulativeCost > budget;

/**
 * Movement actions whose budget never escalates across a turn's cumulative movement
 * session (`movementSession.mts`): full-round actions already resolve to their doubled
 * budget in one step (see `ACTION_SPEED_MULTIPLIER`), and a 5-foot step's flat 1-square
 * allowance has no "double" concept at all.
 */
const NON_ESCALATING_ACTIONS = new Set<string>([
  CHARGE_MOVEMENT_ACTION,
  WITHDRAW_MOVEMENT_ACTION,
  DOUBLE_MOVE_MOVEMENT_ACTION,
  FIVE_FOOT_STEP_MOVEMENT_ACTION,
]);

/** Resolved budget for a single waypoint/drag, judged against the whole turn's cumulative movement rather than in isolation. */
interface SessionAwareBudget {
  /** Total distance moved this turn if the current drag were completed right now. */
  totalCost: number;
  /** The budget `totalCost` is judged against — doubled once the turn has escalated to a Double Move. */
  budget: number;
  overBudget: boolean;
  isDoubleMove: boolean;
}

/**
 * Escalates `singleBudget` to a full-round Double Move's 2x budget once `totalCost`
 * exceeds it — mirrors `TokenDocumentDnd35e#consumeSessionMovement`'s `requiredTiers`
 * escalation, so `TokenRulerDnd35e`'s live path coloring/labels stay in sync with what
 * actually happens once the drag is committed.
 *
 * `totalCost` must already be the *whole turn's* cumulative distance, not just this
 * drag's own delta. Foundry's native `waypoint.measurement.cost` already is this total:
 * the token ruler measures a single continuous path built from the combatant's
 * `_movementHistory` (this turn's already-committed drags — auto-cleared at the start
 * of each turn by `Combat#_onStartTurn`) followed by the current drag, so a later
 * waypoint's cost already includes every earlier drag this turn. Adding our own
 * `movementSession.mts` cumulative cost on top of it here would double-count.
 * `singleBudget`/`totalCost` must both already be converted to the scene's localized
 * distance units (matching `waypoint.measurement.cost`'s domain).
 */
const getSessionAwareBudget = (
  singleBudget: number,
  action: string,
  totalCost: number,
  isBudgetEscalatable: boolean
): SessionAwareBudget => {
  if (NON_ESCALATING_ACTIONS.has(action)) {
    return { totalCost, budget: singleBudget, overBudget: isOverBudget(totalCost, singleBudget), isDoubleMove: false };
  }

  if (totalCost <= singleBudget || !isBudgetEscalatable) {
    return { totalCost, budget: singleBudget, overBudget: totalCost > singleBudget, isDoubleMove: false };
  }

  const doubleBudget = singleBudget * 2;
  return { totalCost, budget: doubleBudget, overBudget: totalCost > doubleBudget, isDoubleMove: true };
};

export { getMovementBudget, getSessionAwareBudget, isOverBudget };
export type { SessionAwareBudget };
