/**
 * combatantActionEconomy — per-round action-economy state for a combatant, stored in
 * `flags.dnd35e.actionEconomy` (`Combatant` has no `system`/`TypeDataModel` slot in this
 * Foundry version — see phase-10-basic-combat.md §10.1). Plain functions operating on a
 * passed-in document, matching the convention already established by
 * `movementBudget.mts`/`movementActionGating.mts` rather than a stateful wrapper class.
 *
 * @module
 */
import type { Creature } from '@actors/creature/index.mjs';
import type { ActionEconomyType } from '@constants/actionEconomy.mjs';
import { FULL_ROUND_ACTION, MINOR_ACTION, MOVE_ACTION, STANDARD_ACTION } from '@constants/actionEconomy.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import type { CombatantDnd35e } from './CombatantDnd35e.mjs';

// Action Economy

const ACTION_ECONOMY_FLAG = 'actionEconomy';

interface CombatantActionEconomy {
  actions: {
    [STANDARD_ACTION]: boolean;
    [MOVE_ACTION]: boolean;
    [MINOR_ACTION]: boolean;
    aoo: number;
  };
  bab: { main: number; off: number };
  used: {
    [STANDARD_ACTION]: boolean;
    [MOVE_ACTION]: boolean;
    [MINOR_ACTION]: boolean;
    /** Reserved for Story D (full-attack-sequence UX) — not set or read by Story B. */
    standardAttackUsed: boolean;
    movedAfterAttack: boolean;
    chargedThisTurn: boolean;
  };
}

const DEFAULT_ACTION_ECONOMY: CombatantActionEconomy = {
  actions: { [STANDARD_ACTION]: true, [MOVE_ACTION]: true, [MINOR_ACTION]: true, aoo: 0 },
  bab: { main: 0, off: 0 },
  used: { [STANDARD_ACTION]: false, [MOVE_ACTION]: false, [MINOR_ACTION]: false, standardAttackUsed: false, movedAfterAttack: false, chargedThisTurn: false },
};

/** Reads `flags.dnd35e.actionEconomy`, applying defaults for any missing keys. */
function getActionEconomy(combatant: CombatantDnd35e): CombatantActionEconomy {
  const stored = combatant.getFlag(SYSTEM_ID, ACTION_ECONOMY_FLAG) as Partial<CombatantActionEconomy> | undefined;
  return {
    actions: { ...DEFAULT_ACTION_ECONOMY.actions, ...stored?.actions },
    bab: { ...DEFAULT_ACTION_ECONOMY.bab, ...stored?.bab },
    used: { ...DEFAULT_ACTION_ECONOMY.used, ...stored?.used },
  };
}

async function setActionEconomy(combatant: CombatantDnd35e, economy: CombatantActionEconomy): Promise<void> {
  await combatant.setFlag(SYSTEM_ID, ACTION_ECONOMY_FLAG, economy);
}

/** Refills both BAB pools and AoO count from the actor, resets all actions, clears all `used` flags. */
async function resetActionEconomy(combatant: CombatantDnd35e, actor: Creature): Promise<void> {
  await setActionEconomy(combatant, {
    actions: { [STANDARD_ACTION]: true, [MOVE_ACTION]: true, [MINOR_ACTION]: true, aoo: actor.system.aooCount },
    bab: { main: actor.system.bab, off: actor.system.bab },
    used: { [STANDARD_ACTION]: false, [MOVE_ACTION]: false, [MINOR_ACTION]: false, standardAttackUsed: false, movedAfterAttack: false, chargedThisTurn: false },
  });
}

// Standard, Move, and Minor Actions


/**
 * Ascending SRD action hierarchy this pool-based tracker currently implements — a higher
 * tier can always cover a lower-tier request (a standard covers a move or minor; a move
 * covers a minor), never the reverse. `free` never goes through this hierarchy (it costs
 * nothing by definition). `fullRound` is a real SRD tier but isn't trackable here yet —
 * partial-round bookkeeping (what remains spendable if a full-round action gets
 * initiated mid-turn) needs dedicated design (see phase-10 notes), so for now a
 * `fullRound` (or any other not-yet-implemented) request is simply ignored: it's treated
 * as already available and never actually claims a pool, rather than being gated or
 * crashing on an untracked key.
 */
type TrackedActionTier = typeof MINOR_ACTION | typeof MOVE_ACTION | typeof STANDARD_ACTION;

function isTrackedActionTier(action: ActionEconomyType): action is TrackedActionTier {
  return action === MINOR_ACTION || action === MOVE_ACTION || action === STANDARD_ACTION;
}

const ACTION_HIERARCHY: TrackedActionTier[] = [
  MINOR_ACTION,
  MOVE_ACTION,
  STANDARD_ACTION,
];

/**
 * The pools that would actually be spent for `actions` — each entry resolved to itself or a
 * higher tier per `ACTION_HIERARCHY`, with no pool reused across two entries. Requests are
 * resolved highest-requirement first (`standard` before `move` before `minor`) so a scarce
 * `standard` pool is claimed by an actual standard request before a lower request
 * opportunistically borrows it. Order matches the input `actions`. Not-yet-implemented
 * tiers (see `isTrackedActionTier`) are passed through unchanged, never gated. Null if the
 * trackable subset can't be covered — e.g. a compound cost like `['move', 'standard']` (a
 * full-round action) is all-or-nothing, never partially spent.
 */
function canUseAction(combatant: CombatantDnd35e, actions: ActionEconomyType[]): ActionEconomyType[] | null {
  // Full round actions are not yet supported — return null to indicate they can't be used.
  // TODO: implement full-round action handling
  if (actions.includes(FULL_ROUND_ACTION)) return null;
  const economy = getActionEconomy(combatant);
  const available = { ...economy.actions };
  const resolved = new Map<TrackedActionTier, TrackedActionTier>();

  const trackable = actions.filter(isTrackedActionTier);
  const byDescendingTier = [...trackable].sort((a, b) => ACTION_HIERARCHY.indexOf(b) - ACTION_HIERARCHY.indexOf(a));
  for (const requested of byDescendingTier) {
    const tiers = ACTION_HIERARCHY.slice(ACTION_HIERARCHY.indexOf(requested));
    const tier = tiers.find((candidate) => available[candidate]);
    if (!tier) return null;
    available[tier] = false;
    resolved.set(requested, tier);
  }

  return actions.map((requested) => (
    isTrackedActionTier(requested)
      ? resolved.get(requested) as TrackedActionTier
      : requested
  ));
}

/** Spends `actions` (see `canUseAction`) and returns the pools actually spent, or null if the full set wasn't available (nothing is spent in that case). */
async function spendAction(combatant: CombatantDnd35e, actions: ActionEconomyType[]): Promise<ActionEconomyType[] | null> {
  const used = canUseAction(combatant, actions);
  if (!used) return null;
  const economy = getActionEconomy(combatant);
  for (const tier of used) {
    if (!isTrackedActionTier(tier)) continue;
    economy.actions[tier] = false;
    economy.used[tier] = true;
  }
  await setActionEconomy(combatant, economy);
  return used;
}

/** Inverse of spendAction — refunds the exact pools that were spent (see spendAction's return value; no hierarchy lookup needed here). */
async function refundAction(combatant: CombatantDnd35e, actions: ActionEconomyType[]): Promise<void> {
  const economy = getActionEconomy(combatant);
  for (const tier of actions) {
    if (!isTrackedActionTier(tier)) continue;
    economy.actions[tier] = true;
    economy.used[tier] = false;
  }
  await setActionEconomy(combatant, economy);
}

// Bab Tracking

function canUseHandAttack(combatant: CombatantDnd35e, hand: 'main' | 'off' | 'both'): boolean {
  const economy = getActionEconomy(combatant);
  if (economy.actions.standard) return true;
  if (economy.used.movedAfterAttack) return false;
  // Two-handed wielding needs BAB remaining in *both* pools — spendHandBab()'s 'both' case draws from both at once.
  return hand === 'both'
    ? (economy.bab.main > 0 && economy.bab.off > 0)
    : economy.bab[hand] > 0;
}

async function spendHandBab(combatant: CombatantDnd35e, hand: 'main' | 'off' | 'both', amount: number): Promise<void> {
  const economy = getActionEconomy(combatant);
  if (hand === 'both') {
    economy.bab.main = Math.max(0, economy.bab.main - amount);
    economy.bab.off = Math.max(0, economy.bab.off - amount);
  } else {
    economy.bab[hand] = Math.max(0, economy.bab[hand] - amount);
  }
  await setActionEconomy(combatant, economy);
}

async function refundHandBab(combatant: CombatantDnd35e, hand: 'main' | 'off' | 'both', amount: number, actor: Creature): Promise<void> {
  const economy = getActionEconomy(combatant);
  const cap = actor.system.bab;
  if (hand === 'both') {
    economy.bab.main = Math.min(cap, economy.bab.main + amount);
    economy.bab.off = Math.min(cap, economy.bab.off + amount);
  } else {
    economy.bab[hand] = Math.min(cap, economy.bab[hand] + amount);
  }
  await setActionEconomy(combatant, economy);
}

// AoO (Attack of Opportunity) Tracking
function canUseAoO(combatant: CombatantDnd35e): boolean {
  const economy = getActionEconomy(combatant);
  return economy.actions.aoo > 0;
}

async function spendAoO(combatant: CombatantDnd35e): Promise<boolean> {
  const economy = getActionEconomy(combatant);
  if (economy.actions.aoo <= 0) return false;
  economy.actions.aoo = Math.max(0, economy.actions.aoo - 1);
  await setActionEconomy(combatant, economy);
  return true;
}

// Various Action Flags (Charged, Moved After Attack)

/**
 * Set by `_onUpdateMovement()` once a `charge` movement action completes. Read directly by
 * `executeAction()` to auto-check the Charge toggle; consumed by `useAction()` right after that
 * attack resolves (calls `markMovedAfterAttack()` to enforce SRD's "only a single melee attack"
 * charge restriction) — never cleared independently, since `resetActionEconomy()` wipes all
 * `used` flags at the combatant's next turn anyway.
 */
async function markChargedThisTurn(combatant: CombatantDnd35e): Promise<void> {
  const economy = getActionEconomy(combatant);
  economy.used.chargedThisTurn = true;
  await setActionEconomy(combatant, economy);
}

async function markMovedAfterAttack(combatant: CombatantDnd35e): Promise<void> {
  const economy = getActionEconomy(combatant);
  economy.used.movedAfterAttack = true;
  await setActionEconomy(combatant, economy);
}

/**
 * Set the first time `useAction()` actually spends the standard action for a weapon
 * attack this turn (poc.10 Story D) — distinct from `used.standard` (which just tracks
 * whether the standard-action pool itself has been spent, for any reason). Reserved for
 * a future full-attack-sequence UX to distinguish "already attacking this turn" from
 * "used my standard action on something else."
 */
async function markStandardAttackUsed(combatant: CombatantDnd35e): Promise<void> {
  const economy = getActionEconomy(combatant);
  economy.used.standardAttackUsed = true;
  await setActionEconomy(combatant, economy);
}

export {
  canUseAction,
  canUseAoO,
  canUseHandAttack,
  getActionEconomy,
  markChargedThisTurn,
  markMovedAfterAttack,
  markStandardAttackUsed,
  refundAction,
  refundHandBab,
  resetActionEconomy,
  spendAction,
  spendAoO,
  spendHandBab,
};

export type { CombatantActionEconomy };
