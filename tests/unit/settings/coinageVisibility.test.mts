import { visibilityWithinBounds } from '@settings/currency/logic/coinageVisibility.mjs';
import {
  coinageVisibilityEveryone,
  coinageVisibilityGmOnly,
  coinageVisibilityGmSelect,
} from '@settings/currency/types.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Unit tests for `visibilityWithinBounds` (src/settings/currency/logic/coinageVisibility.mts).
 *
 * Ranking: everyone (0) < gmSelect (1) < gmOnly (2). "Within bounds" means the value
 * being tested is no MORE restrictive than the limit.
 */

describe('visibilityWithinBounds', () => {
  it('allows a visibility exactly equal to the limit', () => {
    expect(visibilityWithinBounds(coinageVisibilityEveryone, coinageVisibilityEveryone)).toBe(true);
    expect(visibilityWithinBounds(coinageVisibilityGmSelect, coinageVisibilityGmSelect)).toBe(true);
    expect(visibilityWithinBounds(coinageVisibilityGmOnly, coinageVisibilityGmOnly)).toBe(true);
  });

  it('allows a less-restrictive visibility than the limit', () => {
    expect(visibilityWithinBounds(coinageVisibilityEveryone, coinageVisibilityGmSelect)).toBe(true);
    expect(visibilityWithinBounds(coinageVisibilityEveryone, coinageVisibilityGmOnly)).toBe(true);
    expect(visibilityWithinBounds(coinageVisibilityGmSelect, coinageVisibilityGmOnly)).toBe(true);
  });

  it('rejects a more-restrictive visibility than the limit', () => {
    expect(visibilityWithinBounds(coinageVisibilityGmSelect, coinageVisibilityEveryone)).toBe(false);
    expect(visibilityWithinBounds(coinageVisibilityGmOnly, coinageVisibilityEveryone)).toBe(false);
    expect(visibilityWithinBounds(coinageVisibilityGmOnly, coinageVisibilityGmSelect)).toBe(false);
  });
});
