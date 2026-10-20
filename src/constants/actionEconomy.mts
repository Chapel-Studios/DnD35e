const MOVE_ACTION = 'move';
const STANDARD_ACTION = 'standard';
const FULL_ROUND_ACTION = 'fullRound';
const FREE_ACTION = 'free';
const SWIFT_ACTION = 'swift';
const AOO_ACTION = 'aoo';

const ACTION_ECONOMY_TYPES = [
  FREE_ACTION,
  SWIFT_ACTION,
  MOVE_ACTION,
  STANDARD_ACTION,
  FULL_ROUND_ACTION,
  AOO_ACTION,
] as const;

type ActionEconomyType = typeof ACTION_ECONOMY_TYPES[number];

// Loosely-typed `Record<string, ...>` previously let `ACTION_ECONOMY.Standard` (wrong casing)
// silently resolve to `undefined` instead of a compile error. Inferred literal keys instead,
// with `as const` so each property keeps its narrow `ActionEconomyType` literal rather than
// widening to `string` (an object literal loses a referenced const's literal "freshness"
// without it) — callers like `spendAction()` need the literal union, not a bare `string`.
const ACTION_ECONOMY = {
  MOVE: MOVE_ACTION,
  STANDARD: STANDARD_ACTION,
  FULL_ROUND: FULL_ROUND_ACTION,
  FREE: FREE_ACTION,
  SWIFT: SWIFT_ACTION,
  AOO: AOO_ACTION,
} as const;

export {
  ACTION_ECONOMY,
  ACTION_ECONOMY_TYPES,
  AOO_ACTION,
  FREE_ACTION,
  FULL_ROUND_ACTION,
  MOVE_ACTION,
  STANDARD_ACTION,
  SWIFT_ACTION,
};

export type {
  ActionEconomyType,
};
