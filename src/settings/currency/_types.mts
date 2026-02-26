/**
 * Type definitions for currency settings
 */

/**
 * Single currency entry
 */
export interface CurrencyEntry {
  /** Currency identifier */
  id: string;
  /** Display name */
  name: string;
  /** Weight per unit */
  weight: number;
  /** Value in gold pieces */
  valueInGp: number;
  /** Currency group name */
  group: string;
}

/**
 * Currency configuration settings
 */
export interface CurrencyConfig {
  currency: CurrencyEntry[];
}
