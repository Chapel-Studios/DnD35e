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
import { SYSTEM_ID } from '@settings/shared.mjs';

import type { CombatantDnd35e } from './CombatantDnd35e.mjs';

// Action Economy

const ACTION_ECONOMY_FLAG = 'actionEconomy';

interface CombatantActionEconomy {
  actions: { standard: boolean; move: boolean; minor: boolean; aoo: number };
  bab: { main: number; off: number };
  used: {
    standard: boolean;
    move: boolean;
    minor: boolean;
    /** Reserved for Story D (full-attack-sequence UX) — not set or read by Story B. */
    standardAttackUsed: boolean;
    movedAfterAttack: boolean;
    chargedThisTurn: boolean;
  };
}

const DEFAULT_ACTION_ECONOMY: CombatantActionEconomy = {
  actions: { standard: true, move: true, minor: true, aoo: 0 },
  bab: { main: 0, off: 0 },
  used: { standard: false, move: false, minor: false, standardAttackUsed: false, movedAfterAttack: false, chargedThisTurn: false },
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
    actions: { standard: true, move: true, minor: true, aoo: actor.system.aooCount },
    bab: { main: actor.system.bab, off: actor.system.bab },
    used: { standard: false, move: false, minor: false, standardAttackUsed: false, movedAfterAttack: false, chargedThisTurn: false },
  });
}

// Standard, Move, and Minor Actions

type ActionEconomyActionType = 'standard' | 'move' | 'minor';

/** Ascending SRD action hierarchy — a higher tier can always cover a lower-tier request (a standard covers a move or minor; a move covers a minor), never the reverse. */
const ACTION_HIERARCHY: ActionEconomyActionType[] = ['minor', 'move', 'standard'];

/**
 * The pools that would actually be spent for `actions` — each entry resolved to itself or a
 * higher tier per `ACTION_HIERARCHY`, with no pool reused across two entries. Requests are
 * resolved highest-requirement first (`standard` before `move` before `minor`) so a scarce
 * `standard` pool is claimed by an actual standard request before a lower request
 * opportunistically borrows it. Order matches the input `actions`. Null if the full set
 * can't be covered — e.g. a compound cost like `['move', 'standard']` (a full-round action)
 * is all-or-nothing, never partially spent.
 */
function canUseAction(combatant: CombatantDnd35e, actions: ActionEconomyActionType[]): ActionEconomyActionType[] | null {
  const economy = getActionEconomy(combatant);
  const available = { ...economy.actions };
  const resolved = new Map<ActionEconomyActionType, ActionEconomyActionType>();

  const byDescendingTier = [...actions].sort((a, b) => ACTION_HIERARCHY.indexOf(b) - ACTION_HIERARCHY.indexOf(a));
  for (const requested of byDescendingTier) {
    const tiers = ACTION_HIERARCHY.slice(ACTION_HIERARCHY.indexOf(requested));
    const tier = tiers.find((candidate) => available[candidate]);
    if (!tier) return null;
    available[tier] = false;
    resolved.set(requested, tier);
  }

  return actions.map((requested) => resolved.get(requested) as ActionEconomyActionType);
}

/** Spends `actions` (see `canUseAction`) and returns the pools actually spent, or null if the full set wasn't available (nothing is spent in that case). */
async function spendAction(combatant: CombatantDnd35e, actions: ActionEconomyActionType[]): Promise<ActionEconomyActionType[] | null> {
  const used = canUseAction(combatant, actions);
  if (!used) return null;
  const economy = getActionEconomy(combatant);
  for (const tier of used) {
    economy.actions[tier] = false;
    economy.used[tier] = true;
  }
  await setActionEconomy(combatant, economy);
  return used;
}

/** Inverse of spendAction — refunds the exact pools that were spent (see spendAction's return value; no hierarchy lookup needed here). */
async function refundAction(combatant: CombatantDnd35e, actions: ActionEconomyActionType[]): Promise<void> {
  const economy = getActionEconomy(combatant);
  for (const tier of actions) {
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

export {
  canUseAction,
  canUseAoO,
  canUseHandAttack,
  getActionEconomy,
  markChargedThisTurn,
  markMovedAfterAttack,
  refundAction,
  refundHandBab,
  resetActionEconomy,
  spendAction,
  spendAoO,
  spendHandBab,
};

export type { ActionEconomyActionType, CombatantActionEconomy };
