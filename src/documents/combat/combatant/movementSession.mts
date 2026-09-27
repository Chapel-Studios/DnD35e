/**
 * movementSession — per-turn cumulative movement accounting for a combatant, stored in
 * `flags.dnd35e.movementSession` (sibling flag to `combatantActionEconomy.mts`'s
 * `flags.dnd35e.actionEconomy`, not folded into that shape since it tracks a different
 * concern: distance covered *this turn* rather than which action pools remain).
 *
 * SRD movement can be split across multiple partial drags within the same turn (move,
 * attack, move again) — this module lets `TokenDocumentDnd35e#_onUpdateMovement()` accumulate
 * cost across those drags instead of re-deriving a fresh, independent budget check on every
 * single drag (which previously let a second short drag silently exceed the turn's real
 * budget with no warning, and let a completed 5-foot step not block a later normal move).
 *
 * A 5-foot step and ordinary movement (walk/run/crawl/fly/swim/climb/burrow) are mutually
 * exclusive for the whole turn, regardless of distance — `category` locks in on the first
 * move of the turn and any later move of the other category is rejected outright.
 *
 * @module
 */
import type { ActionEconomyType } from '@constants/actionEconomy.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import type { CombatantDnd35e } from './CombatantDnd35e.mjs';

const MOVEMENT_SESSION_FLAG = 'movementSession';

type MovementSessionCategory = 'step' | 'normal';

interface MovementSession {
  /** Locked in by the first movement of the turn; `null` if nothing has moved yet. */
  category: MovementSessionCategory | null;
  /** Total distance (scene distance units) covered by this turn's tracked movement so far. */
  cumulativeCost: number;
  /** Action-economy pools already spent by this turn's movement (see `combatantActionEconomy.mts`). */
  spentTiers: ActionEconomyType[];
  /** The token's position before any movement this turn — where a full Undo snaps back to. */
  firstOrigin: { x: number; y: number; elevation: number } | null;
  /** The chat message being updated in place across this turn's movement, if one has been posted. */
  messageId: string | null;
  /** The most recent movement action used this turn — needed to recompute the right budget when Foundry's native movement Undo (Ctrl+Z) reconciles the session (see `TokenDocumentDnd35e#reconcileUndoneMovement`). */
  lastMovementAction: string | null;
  /**
   * The most recent full-round move (Charge/Withdraw/Double Move) this turn, if any — tracked
   * separately from the fields above since full-round moves are atomic one-shot spends that
   * bypass the cumulative session entirely (see `TokenDocumentDnd35e#performFullRoundMove`).
   * `movementId` is the drag's `movement.id`, used to detect whether Foundry's native Undo
   * (Ctrl+Z) has reverted this specific drag (it's no longer present in `movementHistory`).
   */
  fullRoundMove: { movementId: string; spentTiers: ActionEconomyType[]; messageId: string | null } | null;
}

const DEFAULT_MOVEMENT_SESSION: MovementSession = {
  category: null,
  cumulativeCost: 0,
  spentTiers: [],
  firstOrigin: null,
  messageId: null,
  lastMovementAction: null,
  fullRoundMove: null,
};

function getMovementSession(combatant: CombatantDnd35e): MovementSession {
  const stored = combatant.getFlag(SYSTEM_ID, MOVEMENT_SESSION_FLAG) as Partial<MovementSession> | undefined;
  return { ...DEFAULT_MOVEMENT_SESSION, ...stored };
}

async function setMovementSession(combatant: CombatantDnd35e, session: MovementSession): Promise<void> {
  await combatant.setFlag(SYSTEM_ID, MOVEMENT_SESSION_FLAG, session);
}

/** Called from `CombatDnd35e._onStartTurn()` alongside `resetActionEconomy()`. */
async function resetMovementSession(combatant: CombatantDnd35e): Promise<void> {
  await setMovementSession(combatant, DEFAULT_MOVEMENT_SESSION);
}

export { getMovementSession, resetMovementSession, setMovementSession };
export type { MovementSession, MovementSessionCategory };
