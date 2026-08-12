import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import { EFFECT_CHANGE_TARGET } from '@effects/baseActiveEffect/data/constants.mjs';
import { resolveActiveEffectChangeKey } from '@effects/baseActiveEffect/logic/resolveChangeKey.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Unit tests for the `name` → `system.nameFormula.formula` key remap in
 * `resolveActiveEffectChangeKey()`.
 *
 * `ItemDnd35e.name` is a live-computed getter (derived from `system.nameFormula`) with
 * no writable backing field, so an AE change targeting `name` must be redirected onto
 * the real, writable `system.nameFormula.formula` field before it reaches
 * `applyStackedActiveEffectChanges()`/core's `ActiveEffect.applyChange()`. Actor-targeted
 * `name` changes are left untouched — `ActorDnd35e.name` is still a plain writable field.
 *
 * Only the fast (non-`$conditional(`) path is exercised here — the `$conditional(...)`
 * resolution path is covered separately in `familiar/conditional-formula.test.mts` and
 * `components/EffectChangesList.test.mts`; this suite only verifies the remap applied to
 * whatever literal key resolution produces.
 */
function mkChange (overrides: Partial<EffectChangeDataDnd35e> = {}): EffectChangeDataDnd35e {
  return {
    key: 'name',
    value: 'Lucky Longsword',
    mode: 2,
    priority: 0,
    ...overrides,
  } as EffectChangeDataDnd35e;
}

describe('resolveActiveEffectChangeKey — name → nameFormula.formula remap', () => {
  it('remaps a plain "name" key to "system.nameFormula.formula" for item-targeted changes', () => {
    const change = mkChange({ target: EFFECT_CHANGE_TARGET.ITEM });

    expect(resolveActiveEffectChangeKey({} as never, change)).toBe('system.nameFormula.formula');
  });

  it('leaves a plain "name" key untouched for actor-targeted changes', () => {
    const change = mkChange({ target: EFFECT_CHANGE_TARGET.ACTOR });

    expect(resolveActiveEffectChangeKey({} as never, change)).toBe('name');
  });

  it('leaves a plain "name" key untouched when target is omitted (defaults to actor)', () => {
    const change = mkChange({ target: undefined });

    expect(resolveActiveEffectChangeKey({} as never, change)).toBe('name');
  });

  it('does not affect non-"name" keys', () => {
    const change = mkChange({ key: 'system.hardness', target: EFFECT_CHANGE_TARGET.ITEM });

    expect(resolveActiveEffectChangeKey({} as never, change)).toBe('system.hardness');
  });
});
