/**
 * Type definitions for currency settings
 */

// ─── Coinage Visibility ─────────────────────────────────────────────────────

/** Everyone can see and select this coin */
const coinageVisibilityEveryone = 'everyone';
type CoinageVisibilityEveryone = typeof coinageVisibilityEveryone;

/** Only GMs can select this coin, but players can see they have it */
const coinageVisibilityGmSelect = 'gmSelect';
type CoinageVisibilityGmSelect = typeof coinageVisibilityGmSelect;

/** Only GMs can see this coin at all */
const coinageVisibilityGmOnly = 'gmOnly';
type CoinageVisibilityGmOnly = typeof coinageVisibilityGmOnly;

type CoinageVisibility = CoinageVisibilityEveryone | CoinageVisibilityGmSelect | CoinageVisibilityGmOnly;

const COINAGE_VISIBILITIES = {
  everyone: coinageVisibilityEveryone,
  gmSelect: coinageVisibilityGmSelect,
  gmOnly: coinageVisibilityGmOnly,
} as const;

// ─── Coinage Definition ─────────────────────────────────────────────────────

/**
 * Definition of a single coinage type in the world.
 * System coins have IDs like 'gp', custom coins are prefixed with 'custom_'
 */
interface CoinageDefinition {
  /** Unique identifier (system coins: 'cp', 'gp', etc.; custom: 'custom_xxx') */
  id: string;
  /** Display name (e.g., "Gold Piece") */
  label: string;
  /** Short label for compact display (e.g., "gp") */
  shortLabel: string;
  /** Value relative to 1 gold piece (gp = 1, sp = 0.1, cp = 0.01, pp = 10) */
  valueInGp: number;
  /** Weight per coin in pounds */
  weightLbs: number;
  /** Whether this is a built-in system coin (cannot be deleted, only disabled) */
  isSystem: boolean;
  /** Whether this coin is enabled in the world */
  enabled: boolean;
  /** Visibility/selectability of this coin */
  visibility: CoinageVisibility;
}

// ─── Currency Config ────────────────────────────────────────────────────────

/**
 * Currency configuration stored in settings
 */
interface CurrencyConfig {
  /** All coinage types available in this world */
  coinages: CoinageDefinition[];
  /** Default coin to display when price is empty (e.g., 'gp') */
  defaultDisplayCoin: string;
  /** Target coin for the "roll up" consolidation feature (e.g., 'gp') */
  rollUpTargetCoin: string;
  /** Used for auto id generation for custom coins */
  autoIdCounter: number;
}

// ─── Coin Stack (for item prices) ───────────────────────────────────────────

/**
 * A stack of coins of a single type. Used in item prices.
 */
interface CoinStack {
  /** References CoinageDefinition.id */
  coinId: string;
  /** Number of coins in this stack */
  count: number;
}

/**
 * Price represented as an array of coin stacks.
 * Each coin type can only appear once.
 */
type Price = CoinStack[];

// ─── Exports ────────────────────────────────────────────────────────────────

export {
  COINAGE_VISIBILITIES,
  coinageVisibilityEveryone,
  coinageVisibilityGmOnly,
  coinageVisibilityGmSelect,
};

export type {
  CoinageDefinition,
  CoinageVisibility,
  CoinStack,
  CurrencyConfig,
  Price,
};
