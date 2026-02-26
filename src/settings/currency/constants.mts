/**
 * Currency settings constants
 */

import type { CurrencyConfig, CurrencyEntry } from './_types.mjs';

/** Currency config setting key */
export const CURRENCY_KEY = 'currencyConfig';

/** Currency settings menu key */
export const CURRENCY_MENU = 'currencyConfig';

/** Default currency configuration */
export const DEFAULT_CURRENCY_CONFIG: CurrencyConfig = {
  currency: [],
};

export type { CurrencyConfig, CurrencyEntry };
