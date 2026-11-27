import { BaseWeaponNameCache } from '@items/physical/weapon/logic/BaseWeaponNameCache.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const baseEntry = (name: string) => ({ name, system: { isBaseWeaponType: true } });

describe('BaseWeaponNameCache', () => {
  const getIndex = vi.fn();

  beforeEach(() => {
    BaseWeaponNameCache.invalidate();
    getIndex.mockReset();
    vi.stubGlobal('game', {
      ...game,
      packs: [{ documentName: 'Item', getIndex }],
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shares index loads and caches only base weapon names', async () => {
    getIndex.mockResolvedValue([
      baseEntry('Battle Axe'),
      baseEntry('Battle Axe'),
      { name: 'Lucky Battle Axe', system: { isBaseWeaponType: false } },
    ]);

    const [first, second] = await Promise.all([
      BaseWeaponNameCache.getNames(),
      BaseWeaponNameCache.getNames(),
    ]);

    expect([...first]).toEqual(['Battle Axe']);
    expect(second).toBe(first);
    expect(await BaseWeaponNameCache.getNames()).toBe(first);
    expect(getIndex).toHaveBeenCalledTimes(1);
  });

  it('propagates an index failure and allows a later retry', async () => {
    const failure = new Error('Index unavailable');
    getIndex.mockRejectedValueOnce(failure).mockResolvedValueOnce([baseEntry('Javelin')]);

    await expect(BaseWeaponNameCache.getNames()).rejects.toBe(failure);
    expect(await BaseWeaponNameCache.getNames()).toEqual(new Set(['Javelin']));
    expect(getIndex).toHaveBeenCalledTimes(2);
  });

  it('does not restore stale results when invalidated during an index load', async () => {
    let resolveOld!: (entries: ReturnType<typeof baseEntry>[]) => void;
    getIndex.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    const oldRequest = BaseWeaponNameCache.getNames();

    BaseWeaponNameCache.invalidate();
    getIndex.mockResolvedValueOnce([baseEntry('Renamed Axe')]);
    const current = await BaseWeaponNameCache.getNames();
    resolveOld([baseEntry('Old Axe')]);
    await oldRequest;

    expect(await BaseWeaponNameCache.getNames()).toBe(current);
    expect(current).toEqual(new Set(['Renamed Axe']));
    expect(getIndex).toHaveBeenCalledTimes(2);
  });
});
