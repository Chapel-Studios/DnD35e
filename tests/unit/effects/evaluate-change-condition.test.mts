import { evaluateChangeCondition } from '@effects/baseActiveEffect/logic/evaluateChangeCondition.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests for `evaluateChangeCondition()` (Story B, §7.7a).
 *
 * Uses the real `FormulaData.resolveSource()` (not mocked) with pure literal
 * boolean expressions (no `#context.property` tokens), matching the approach
 * in `tests/unit/familiar/formula-data-boolean.test.mts` — this avoids needing
 * a full FormulaFamiliar schema registration while still exercising real
 * boolean-grammar resolution end-to-end.
 *
 * Conditions are string-only (FormulaFamiliar boolean grammar) — a function
 * form was removed since conditions are persisted to the database and a
 * function could never round-trip through it.
 */

function mkChange (overrides: Partial<{
  key: string;
  condition: string | null;
}> = {}) {
  return {
    key: 'system.foo',
    value: '5',
    condition: null,
    ...overrides,
  } as any;
}

describe('evaluateChangeCondition', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('condition: null → applies unconditionally (true)', () => {
    const change = mkChange({ condition: null });
    expect(evaluateChangeCondition(change)).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('string condition resolving to "true" → applies (true)', () => {
    const change = mkChange({ condition: '6 > 5' });
    expect(evaluateChangeCondition(change, {})).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('string condition resolving to "false" → skipped (false)', () => {
    const change = mkChange({ condition: '4 > 5' });
    expect(evaluateChangeCondition(change, {})).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('invalid condition formula → errors (not warns) and treats as false, never throws', () => {
    const change = mkChange({ condition: '5 >' });
    expect(() => evaluateChangeCondition(change, {})).not.toThrow();
    expect(evaluateChangeCondition(change, {})).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('string condition with no contextMap → warns and treats as false', () => {
    const change = mkChange({ condition: '6 > 5' });
    expect(evaluateChangeCondition(change)).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });
});
