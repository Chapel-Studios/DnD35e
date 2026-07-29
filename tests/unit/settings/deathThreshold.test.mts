import { resolveDeathThresholdValue } from '@settings/combat/deathThreshold.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Regression tests for `resolveDeathThresholdValue()`'s `Roll.safeEval` call site
 * (no `actor` passed → formula is evaluated as-is). Uses the DEFAULT (un-overridden)
 * `tests/setup.mts` `Roll.safeEval` stub, which throws if called detached from `Roll`
 * — the real Foundry implementation depends on `this.MATH_PROXY` and breaks silently
 * in that case (the exact bug fixed this session across 4 call sites).
 */
describe('resolveDeathThresholdValue — Roll.safeEval this-binding regression', () => {
  it('resolves a plain numeric setting without an actor', () => {
    expect(resolveDeathThresholdValue('-10')).toBe(-10);
  });

  it('resolves a parenthesized formula setting without throwing', () => {
    expect(() => resolveDeathThresholdValue('(0 - 10)')).not.toThrow();
  });

  it('falls back to 0 for an empty setting', () => {
    expect(resolveDeathThresholdValue('')).toBe(0);
  });
});
