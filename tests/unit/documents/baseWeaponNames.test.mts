import { BaseWeaponNameCache } from '@items/physical/weapon/logic/BaseWeaponNameCache.mjs';
import { useBaseWeaponNames } from '@items/physical/weapon/sheet/useBaseWeaponNames.mjs';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EffectScope } from 'vue';
import { effectScope } from 'vue';

const scopes: EffectScope[] = [];
const getIndex = vi.fn();
const entries = (name: string) => [{ name, system: { isBaseWeaponType: true } }];

function consumer () {
  const scope = effectScope();
  scopes.push(scope);
  const names = scope.run(useBaseWeaponNames)!;
  return { scope, names };
}

describe('live base weapon names', () => {
  beforeEach(() => {
    BaseWeaponNameCache.invalidate();
    getIndex.mockReset();
    vi.stubGlobal('game', { ...game, packs: [{ documentName: 'Item', getIndex }] });
    vi.stubGlobal('Hooks', { onError: vi.fn() });
  });
  afterEach(() => {
    for (const scope of scopes.splice(0)) scope.stop();
    BaseWeaponNameCache.invalidate();
    vi.unstubAllGlobals();
  });

  it('refreshes all consumers, shares index loads, and unsubscribes disposed consumers', async () => {
    getIndex.mockResolvedValueOnce(entries('Old Axe'));
    const first = consumer();
    const second = consumer();
    await flushPromises();
    expect([...first.names.value]).toEqual(['Old Axe']);
    expect([...second.names.value]).toEqual(['Old Axe']);
    expect(getIndex).toHaveBeenCalledOnce();

    getIndex.mockResolvedValueOnce(entries('Renamed Axe'));
    BaseWeaponNameCache.invalidate();
    await flushPromises();
    expect([...first.names.value]).toEqual(['Renamed Axe']);
    expect([...second.names.value]).toEqual(['Renamed Axe']);
    expect(getIndex).toHaveBeenCalledTimes(2);

    first.scope.stop();
    getIndex.mockResolvedValueOnce(entries('New Axe'));
    BaseWeaponNameCache.invalidate();
    await flushPromises();
    expect([...first.names.value]).toEqual(['Renamed Axe']);
    expect([...second.names.value]).toEqual(['New Axe']);
    expect(getIndex).toHaveBeenCalledTimes(3);
  });

  it.each(['resolve', 'reject'])('ignores an obsolete load that later %ss', async outcome => {
    let resolveOld!: (value: ReturnType<typeof entries>) => void;
    let rejectOld!: (error: Error) => void;
    getIndex.mockReturnValueOnce(new Promise((resolve, reject) => {
      resolveOld = resolve;
      rejectOld = reject;
    }));
    const { names } = consumer();
    getIndex.mockResolvedValueOnce(entries('Current Axe'));
    BaseWeaponNameCache.invalidate();
    await flushPromises();
    expect([...names.value]).toEqual(['Current Axe']);

    if (outcome === 'resolve') resolveOld(entries('Obsolete Axe'));
    else rejectOld(new Error('Obsolete index failure'));
    await flushPromises();
    expect([...names.value]).toEqual(['Current Axe']);
    expect(await BaseWeaponNameCache.getNames()).toEqual(new Set(['Current Axe']));
    expect(Hooks.onError).not.toHaveBeenCalled();
  });

  it('ignores completion after disposal and does not reload disposed consumers', async () => {
    let resolve!: (value: ReturnType<typeof entries>) => void;
    getIndex.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const { scope, names } = consumer();
    scope.stop();
    resolve(entries('Late Axe'));
    await flushPromises();
    expect([...names.value]).toEqual([]);
    BaseWeaponNameCache.invalidate();
    expect(getIndex).toHaveBeenCalledOnce();
  });

  it('reports refresh failures, preserves valid options, and retries on the next invalidation', async () => {
    getIndex.mockResolvedValueOnce(entries('Existing Axe'));
    const { names } = consumer();
    await flushPromises();
    const error = new Error('Index unavailable');
    getIndex.mockRejectedValueOnce(error);
    BaseWeaponNameCache.invalidate();
    await flushPromises();
    expect([...names.value]).toEqual(['Existing Axe']);
    expect(Hooks.onError).toHaveBeenCalledWith('useBaseWeaponNames#refresh', error, { log: 'error', notify: 'error' });

    getIndex.mockResolvedValueOnce(entries('Recovered Axe'));
    BaseWeaponNameCache.invalidate();
    await flushPromises();
    expect([...names.value]).toEqual(['Recovered Axe']);
  });
});
