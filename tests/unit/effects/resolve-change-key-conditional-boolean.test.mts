import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import { EFFECT_CHANGE_TARGET } from '@effects/baseActiveEffect/data/constants.mjs';
import { resolveActiveEffectChangeKey } from '@effects/baseActiveEffect/logic/resolveChangeKey.mjs';
import { registerFamiliarSchema } from '@helpers/formulae/registry.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Regression test for `resolveActiveEffectChangeKey()`'s `when()` boolean check.
 *
 * `FormulaData.resolveSource()` with `expectedType: 'boolean'` returns a real `boolean`
 * (see `formula-data-boolean.test.mts`/`evaluate-change-condition.test.mts`), but this
 * caller was still comparing against the strings `'true'`/`'false'` — every `$conditional(
 * when(...) ...)` change key was therefore always falling through to `else()` (or failing
 * outright with no `else()`), regardless of the condition's real value.
 */
registerFamiliarSchema('Actor', 'conditionalKeyTestActor' as never, () => ({
  foo: { type: 'string', accessPath: 'system.foo' },
  bar: { type: 'string', accessPath: 'system.bar' },
}));

function mkEffect() {
  return {
    parent: {
      documentName: 'Actor',
      type: 'conditionalKeyTestActor',
      system: { foo: 1, bar: 2 },
    },
  } as never;
}

function mkChange(key: string): EffectChangeDataDnd35e {
  return {
    key,
    value: '1',
    mode: 2,
    priority: 0,
    target: EFFECT_CHANGE_TARGET.ACTOR,
  } as unknown as EffectChangeDataDnd35e;
}

describe('resolveActiveEffectChangeKey — $conditional(...) when() boolean check', () => {
  it('resolves the winning when() branch when its condition is true', () => {
    const change = mkChange('$conditional(when(6 > 5, #actor.foo) else(#actor.bar))');
    expect(resolveActiveEffectChangeKey(mkEffect(), change)).toBe('system.foo');
  });

  it('falls through to else() when no when() clause matches', () => {
    const change = mkChange('$conditional(when(4 > 5, #actor.foo) else(#actor.bar))');
    expect(resolveActiveEffectChangeKey(mkEffect(), change)).toBe('system.bar');
  });

  it('picks the first true when() clause among several', () => {
    const change = mkChange('$conditional(when(4 > 5, #actor.foo) when(6 > 5, #actor.bar) else(#actor.foo))');
    expect(resolveActiveEffectChangeKey(mkEffect(), change)).toBe('system.bar');
  });
});
