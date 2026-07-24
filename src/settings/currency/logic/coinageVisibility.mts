import type { CoinageVisibility } from '../types.mjs';
import {
  coinageVisibilityEveryone,
  coinageVisibilityGmOnly,
  coinageVisibilityGmSelect,
} from '../types.mjs';

/**
 * Per-key restrictiveness ranking. Higher number = more restrictive.
 *
 * `everyone` (0) < `gmSelect` (1) < `gmOnly` (2).
 */
export const OVERRIDE_RANKS = {
  [coinageVisibilityEveryone]: 0,
  [coinageVisibilityGmSelect]: 1,
  [coinageVisibilityGmOnly]: 2,
};

export function visibilityWithinBounds(visibilityToTest: CoinageVisibility, limit: CoinageVisibility): boolean {
  return OVERRIDE_RANKS[visibilityToTest] <= OVERRIDE_RANKS[limit];
}
