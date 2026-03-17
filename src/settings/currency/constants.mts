/**
 * Currency settings constants
 */

import type { CoinageDefinition, CurrencyConfig } from './_types.mjs';
import { coinageVisibilityEveryone } from './_types.mjs';

/** Currency config setting key */
export const CURRENCY_KEY = 'currencyConfig';

/** Currency settings menu key */
export const CURRENCY_MENU = 'currencyConfig';

/** System (SRD) coin ID prefix - all system coins have this prefix */
export const SRD_COIN_PREFIX = 'srd_';

/** User coin ID prefix - all user-created coins must have this prefix */
export const USER_COIN_PREFIX = 'user_';

// ─── SRD Default Coinages ───────────────────────────────────────────────────

/** Standard D&D 3.5e SRD coinage: Copper Piece */
const COIN_CP: CoinageDefinition = {
  id: 'srd_cp',
  label: 'Copper Piece',
  shortLabel: 'cp',
  valueInGp: 0.01,
  weightLbs: 0.02, // 50 coins = 1 lb
  isSystem: true,
  enabled: true,
  visibility: coinageVisibilityEveryone,
};

/** Standard D&D 3.5e SRD coinage: Silver Piece */
const COIN_SP: CoinageDefinition = {
  id: 'srd_sp',
  label: 'Silver Piece',
  shortLabel: 'sp',
  valueInGp: 0.1,
  weightLbs: 0.02,
  isSystem: true,
  enabled: true,
  visibility: coinageVisibilityEveryone,
};

// /** Standard D&D 3.5e SRD coinage: Electrum Piece */
// const COIN_EP: CoinageDefinition = {
//   id: 'srd_ep',
//   label: 'Electrum Piece',
//   shortLabel: 'ep',
//   valueInGp: 0.5,
//   weightLbs: 0.02,
//   isSystem: true,
//   enabled: true,
//   visibility: coinageVisibilityEveryone,
// };

/** Standard D&D 3.5e SRD coinage: Gold Piece */
const COIN_GP: CoinageDefinition = {
  id: 'srd_gp',
  label: 'Gold Piece',
  shortLabel: 'gp',
  valueInGp: 1,
  weightLbs: 0.02,
  isSystem: true,
  enabled: true,
  visibility: coinageVisibilityEveryone,
};

/** Standard D&D 3.5e SRD coinage: Platinum Piece */
const COIN_PP: CoinageDefinition = {
  id: 'srd_pp',
  label: 'Platinum Piece',
  shortLabel: 'pp',
  valueInGp: 10,
  weightLbs: 0.02,
  isSystem: true,
  enabled: true,
  visibility: coinageVisibilityEveryone,
};

/** All SRD system coins in standard order (lowest to highest value) */
export const SRD_COINAGES: CoinageDefinition[] = [
  COIN_CP,
  COIN_SP,
  // COIN_EP,
  COIN_GP,
  COIN_PP,
];

/** Default currency configuration */
export const DEFAULT_CURRENCY_CONFIG: CurrencyConfig = {
  coinages: [...SRD_COINAGES],
  defaultDisplayCoin: 'srd_gp',
  rollUpTargetCoin: 'srd_gp',
  autoIdCounter: 0,
};

export type { CoinageDefinition, CurrencyConfig };
