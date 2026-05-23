import {
  BROKEN_ARMOR_AE_UUID,
  BROKEN_WEAPON_AE_UUID,
  MASTERWORK_ARMOR_AE_UUID,
  MASTERWORK_WEAPON_AE_UUID,
} from '@constants/compendiumUuids.mjs';
import {
  findAllBrokenAes,
  getBrokenAeUuid,
  isBrokenAe,
  isSystemManagedBrokenAe,
  syncBrokenAeState,
} from '@effects/material/logic/brokenAe.mjs';
import {
  findAllMasterworkAes,
  getMasterworkAeUuid,
  isMasterworkAe,
  isSystemManagedMasterworkAe,
  syncMasterworkAeState,
} from '@effects/material/logic/masterworkAe.mjs';
import { materialEffectType } from '@effects/material/materialEffectType.mjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

type FakeAe = {
  type: string;
  disabled: boolean;
  id: string;
  system: { materialSubtype?: string };
  getFlag: (scope: string, key: string) => unknown;
};

function mkBrokenAe (opts: Partial<FakeAe> = {}): FakeAe {
  return {
    type: materialEffectType,
    disabled: true,
    id: 'ae-broken-1',
    system: { materialSubtype: 'broken' },
    getFlag: (_scope, _key) => undefined,
    ...opts,
  };
}

function mkMasterworkAe (opts: Partial<FakeAe> = {}): FakeAe {
  return {
    type: materialEffectType,
    disabled: true,
    id: 'ae-mw-1',
    system: { materialSubtype: 'masterwork' },
    getFlag: (_scope, _key) => undefined,
    ...opts,
  };
}

function mkSystemManagedBrokenAe (opts: Partial<FakeAe> = {}): FakeAe {
  return mkBrokenAe({
    id: 'ae-broken-sys',
    getFlag: (scope, key) => scope === 'dnd35e' && key === 'systemManaged' ? true : undefined,
    ...opts,
  });
}

function mkSystemManagedMasterworkAe (opts: Partial<FakeAe> = {}): FakeAe {
  return mkMasterworkAe({
    id: 'ae-mw-sys',
    getFlag: (scope, key) => scope === 'dnd35e' && key === 'systemManaged' ? true : undefined,
    ...opts,
  });
}

type FakeItem = {
  type: string;
  effects: FakeAe[];
  updateEmbeddedDocuments: ReturnType<typeof vi.fn>;
  createEmbeddedDocuments: ReturnType<typeof vi.fn>;
  deleteEmbeddedDocuments: ReturnType<typeof vi.fn>;
};

function mkItem (type: string, effects: FakeAe[] = []): FakeItem {
  return {
    type,
    effects,
    updateEmbeddedDocuments: vi.fn().mockResolvedValue([]),
    createEmbeddedDocuments: vi.fn().mockResolvedValue([]),
    deleteEmbeddedDocuments: vi.fn().mockResolvedValue([]),
  };
}

// ---------------------------------------------------------------------------
// UUID helpers
// ---------------------------------------------------------------------------

describe('getBrokenAeUuid', () => {
  it('returns weapon UUID for weapon items', () => {
    expect(getBrokenAeUuid('weapon')).toBe(BROKEN_WEAPON_AE_UUID);
  });

  it('returns armor UUID for equipment items', () => {
    expect(getBrokenAeUuid('equipment')).toBe(BROKEN_ARMOR_AE_UUID);
  });

  it('returns null for unsupported item types', () => {
    expect(getBrokenAeUuid('loot')).toBeNull();
    expect(getBrokenAeUuid('consumable')).toBeNull();
  });
});

describe('getMasterworkAeUuid', () => {
  it('returns weapon UUID for weapon items', () => {
    expect(getMasterworkAeUuid('weapon')).toBe(MASTERWORK_WEAPON_AE_UUID);
  });

  it('returns armor UUID for equipment items', () => {
    expect(getMasterworkAeUuid('equipment')).toBe(MASTERWORK_ARMOR_AE_UUID);
  });

  it('returns null for unsupported item types', () => {
    expect(getMasterworkAeUuid('loot')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isBrokenAe / isMasterworkAe predicates
// ---------------------------------------------------------------------------

describe('isBrokenAe', () => {
  it('returns true for a material AE with materialSubtype=broken', () => {
    expect(isBrokenAe(mkBrokenAe() as unknown as ActiveEffect)).toBe(true);
  });

  it('returns false for a material AE with a different subtype', () => {
    const ae = mkBrokenAe({ system: { materialSubtype: 'masterwork' } });
    expect(isBrokenAe(ae as unknown as ActiveEffect)).toBe(false);
  });

  it('returns false for a non-material AE', () => {
    const ae = mkBrokenAe({ type: 'base' });
    expect(isBrokenAe(ae as unknown as ActiveEffect)).toBe(false);
  });

  it('returns false when system is missing', () => {
    const ae = { type: materialEffectType, system: undefined } as any;
    expect(isBrokenAe(ae)).toBe(false);
  });
});

describe('isMasterworkAe', () => {
  it('returns true for a material AE with materialSubtype=masterwork', () => {
    expect(isMasterworkAe(mkMasterworkAe() as unknown as ActiveEffect)).toBe(true);
  });

  it('returns false for a material AE with a different subtype', () => {
    const ae = mkMasterworkAe({ system: { materialSubtype: 'broken' } });
    expect(isMasterworkAe(ae as unknown as ActiveEffect)).toBe(false);
  });

  it('returns false for a non-material AE', () => {
    const ae = mkMasterworkAe({ type: 'base' });
    expect(isMasterworkAe(ae as unknown as ActiveEffect)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isSystemManagedBrokenAe / isSystemManagedMasterworkAe
// ---------------------------------------------------------------------------

describe('isSystemManagedBrokenAe', () => {
  it('returns true when broken + systemManaged flag is true', () => {
    expect(isSystemManagedBrokenAe(mkSystemManagedBrokenAe() as unknown as ActiveEffect)).toBe(true);
  });

  it('returns false for a broken AE without the systemManaged flag', () => {
    expect(isSystemManagedBrokenAe(mkBrokenAe() as unknown as ActiveEffect)).toBe(false);
  });

  it('returns false for a non-broken AE even with the flag', () => {
    const ae = mkMasterworkAe({
      getFlag: (scope, key) => scope === 'dnd35e' && key === 'systemManaged' ? true : undefined,
    });
    expect(isSystemManagedBrokenAe(ae as unknown as ActiveEffect)).toBe(false);
  });
});

describe('isSystemManagedMasterworkAe', () => {
  it('returns true when masterwork + systemManaged flag is true', () => {
    expect(isSystemManagedMasterworkAe(mkSystemManagedMasterworkAe() as unknown as ActiveEffect)).toBe(true);
  });

  it('returns false for a masterwork AE without the systemManaged flag', () => {
    expect(isSystemManagedMasterworkAe(mkMasterworkAe() as unknown as ActiveEffect)).toBe(false);
  });

  it('returns false for a broken AE even with the flag', () => {
    const ae = mkSystemManagedBrokenAe();
    expect(isSystemManagedMasterworkAe(ae as unknown as ActiveEffect)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// findAllBrokenAes / findAllMasterworkAes
// ---------------------------------------------------------------------------

describe('findAllBrokenAes', () => {
  it('returns all broken AEs, including custom ones', () => {
    const broken1 = mkBrokenAe({ id: 'b1' });
    const broken2 = mkBrokenAe({ id: 'b2' });
    const other = mkMasterworkAe({ id: 'mw1' });
    const item = mkItem('weapon', [broken1, broken2, other]);
    const result = findAllBrokenAes(item as any);
    expect(result).toHaveLength(2);
    expect(result.map((ae) => ae.id)).toEqual(['b1', 'b2']);
  });

  it('returns empty array when no broken AEs exist', () => {
    const item = mkItem('weapon', [mkMasterworkAe()]);
    expect(findAllBrokenAes(item as any)).toEqual([]);
  });
});

describe('findAllMasterworkAes', () => {
  it('returns all masterwork AEs, including custom ones', () => {
    const mw1 = mkMasterworkAe({ id: 'mw1' });
    const mw2 = mkMasterworkAe({ id: 'mw2' });
    const other = mkBrokenAe({ id: 'b1' });
    const item = mkItem('weapon', [mw1, mw2, other]);
    const result = findAllMasterworkAes(item as any);
    expect(result).toHaveLength(2);
    expect(result.map((ae) => ae.id)).toEqual(['mw1', 'mw2']);
  });

  it('returns empty array when no masterwork AEs exist', () => {
    const item = mkItem('weapon', [mkBrokenAe()]);
    expect(findAllMasterworkAes(item as any)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// syncBrokenAeState
// ---------------------------------------------------------------------------

describe('syncBrokenAeState', () => {
  beforeEach(() => {
    vi.stubGlobal('fromUuid', vi.fn());
  });

  it('no-op when no broken AEs and turning off', async () => {
    const item = mkItem('weapon', []);
    await syncBrokenAeState(item as any, false);
    expect(item.updateEmbeddedDocuments).not.toHaveBeenCalled();
    expect(item.createEmbeddedDocuments).not.toHaveBeenCalled();
  });

  it('enables all broken AEs when turning on (existing AEs present)', async () => {
    const ae1 = mkBrokenAe({ id: 'b1', disabled: true });
    const ae2 = mkBrokenAe({ id: 'b2', disabled: true });
    const item = mkItem('weapon', [ae1, ae2]);
    await syncBrokenAeState(item as any, true);
    expect(item.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
      { _id: 'b1', disabled: false },
      { _id: 'b2', disabled: false },
    ]);
    expect(item.createEmbeddedDocuments).not.toHaveBeenCalled();
  });

  it('disables all broken AEs when turning off (existing AEs present)', async () => {
    const ae1 = mkBrokenAe({ id: 'b1', disabled: false });
    const ae2 = mkBrokenAe({ id: 'b2', disabled: false });
    const item = mkItem('weapon', [ae1, ae2]);
    await syncBrokenAeState(item as any, false);
    expect(item.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
      { _id: 'b1', disabled: true },
      { _id: 'b2', disabled: true },
    ]);
  });

  it('skips AEs that are already in the target state', async () => {
    const ae1 = mkBrokenAe({ id: 'b1', disabled: false }); // already enabled
    const ae2 = mkBrokenAe({ id: 'b2', disabled: true });   // needs enabling
    const item = mkItem('weapon', [ae1, ae2]);
    await syncBrokenAeState(item as any, true);
    expect(item.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
      { _id: 'b2', disabled: false },
    ]);
  });

  it('no updateEmbeddedDocuments call when all AEs already match target state', async () => {
    const ae1 = mkBrokenAe({ id: 'b1', disabled: false });
    const item = mkItem('weapon', [ae1]);
    await syncBrokenAeState(item as any, true); // ae1 already enabled
    expect(item.updateEmbeddedDocuments).not.toHaveBeenCalled();
  });

  it('preserves custom broken AEs — flips them alongside system-managed', async () => {
    const sysAe = mkSystemManagedBrokenAe({ id: 'sys', disabled: true });
    const customAe = mkBrokenAe({ id: 'custom', disabled: true });
    const item = mkItem('weapon', [sysAe, customAe]);
    await syncBrokenAeState(item as any, true);
    expect(item.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
      { _id: 'sys', disabled: false },
      { _id: 'custom', disabled: false },
    ]);
  });

  it('attaches default AE from compendium when turning on with no existing AEs', async () => {
    const fakeSourceAe = {
      uuid: BROKEN_WEAPON_AE_UUID,
      toObject: () => ({ type: materialEffectType, system: { materialSubtype: 'broken' } }),
    };
    vi.stubGlobal('fromUuid', vi.fn().mockResolvedValue(fakeSourceAe));
    const item = mkItem('weapon', []);
    await syncBrokenAeState(item as any, true);
    expect(item.createEmbeddedDocuments).toHaveBeenCalledOnce();
    const [, [data]] = item.createEmbeddedDocuments.mock.calls[0] as [string, Record<string, unknown>[]];
    expect(data.disabled).toBe(false); // enabled on attach
    expect((data._stats as any).compendiumSource).toBe(BROKEN_WEAPON_AE_UUID);
  });

  it('no-op when fromUuid returns null (compendium missing)', async () => {
    vi.stubGlobal('fromUuid', vi.fn().mockResolvedValue(null));
    const item = mkItem('weapon', []);
    await syncBrokenAeState(item as any, true);
    expect(item.createEmbeddedDocuments).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// syncMasterworkAeState
// ---------------------------------------------------------------------------

describe('syncMasterworkAeState', () => {
  beforeEach(() => {
    vi.stubGlobal('fromUuid', vi.fn());
  });

  it('no-op when no masterwork AEs and turning off', async () => {
    const item = mkItem('weapon', []);
    await syncMasterworkAeState(item as any, false);
    expect(item.updateEmbeddedDocuments).not.toHaveBeenCalled();
    expect(item.createEmbeddedDocuments).not.toHaveBeenCalled();
  });

  it('enables all masterwork AEs when turning on (existing AEs present)', async () => {
    const ae1 = mkMasterworkAe({ id: 'mw1', disabled: true });
    const ae2 = mkMasterworkAe({ id: 'mw2', disabled: true });
    const item = mkItem('weapon', [ae1, ae2]);
    await syncMasterworkAeState(item as any, true);
    expect(item.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
      { _id: 'mw1', disabled: false },
      { _id: 'mw2', disabled: false },
    ]);
    expect(item.createEmbeddedDocuments).not.toHaveBeenCalled();
  });

  it('disables custom masterwork AEs when turning off (no system-managed AEs)', async () => {
    const ae1 = mkMasterworkAe({ id: 'mw1', disabled: false });
    const ae2 = mkMasterworkAe({ id: 'mw2', disabled: false });
    const item = mkItem('weapon', [ae1, ae2]);
    await syncMasterworkAeState(item as any, false);
    expect(item.deleteEmbeddedDocuments).not.toHaveBeenCalled();
    expect(item.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
      { _id: 'mw1', disabled: true },
      { _id: 'mw2', disabled: true },
    ]);
  });

  it('deletes system-managed masterwork AE when turning off', async () => {
    const sysAe = mkSystemManagedMasterworkAe({ id: 'sys', disabled: false });
    const item = mkItem('weapon', [sysAe]);
    await syncMasterworkAeState(item as any, false);
    expect(item.deleteEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', ['sys']);
    expect(item.updateEmbeddedDocuments).not.toHaveBeenCalled();
  });

  it('deletes system-managed and disables custom when turning off (mixed)', async () => {
    const sysAe = mkSystemManagedMasterworkAe({ id: 'sys', disabled: false });
    const customAe = mkMasterworkAe({ id: 'custom', disabled: false });
    const item = mkItem('weapon', [sysAe, customAe]);
    await syncMasterworkAeState(item as any, false);
    expect(item.deleteEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', ['sys']);
    expect(item.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
      { _id: 'custom', disabled: true },
    ]);
  });

  it('skips AEs that are already in the target state', async () => {
    const ae1 = mkMasterworkAe({ id: 'mw1', disabled: false }); // already enabled
    const ae2 = mkMasterworkAe({ id: 'mw2', disabled: true });   // needs enabling
    const item = mkItem('weapon', [ae1, ae2]);
    await syncMasterworkAeState(item as any, true);
    expect(item.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
      { _id: 'mw2', disabled: false },
    ]);
  });

  it('preserves custom masterwork AEs — flips them alongside system-managed', async () => {
    const sysAe = mkSystemManagedMasterworkAe({ id: 'sys', disabled: true });
    const customAe = mkMasterworkAe({ id: 'custom', disabled: true });
    const item = mkItem('weapon', [sysAe, customAe]);
    await syncMasterworkAeState(item as any, true);
    expect(item.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
      { _id: 'sys', disabled: false },
      { _id: 'custom', disabled: false },
    ]);
  });

  it('attaches default AE from compendium when turning on with no existing AEs', async () => {
    const fakeSourceAe = {
      uuid: MASTERWORK_WEAPON_AE_UUID,
      toObject: () => ({ type: materialEffectType, system: { materialSubtype: 'masterwork' } }),
    };
    vi.stubGlobal('fromUuid', vi.fn().mockResolvedValue(fakeSourceAe));
    const item = mkItem('weapon', []);
    await syncMasterworkAeState(item as any, true);
    expect(item.createEmbeddedDocuments).toHaveBeenCalledOnce();
    const [, [data]] = item.createEmbeddedDocuments.mock.calls[0] as [string, Record<string, unknown>[]];
    expect(data.disabled).toBe(false);
    expect((data._stats as any).compendiumSource).toBe(MASTERWORK_WEAPON_AE_UUID);
  });

  it('no-op when fromUuid returns null (compendium missing)', async () => {
    vi.stubGlobal('fromUuid', vi.fn().mockResolvedValue(null));
    const item = mkItem('weapon', []);
    await syncMasterworkAeState(item as any, true);
    expect(item.createEmbeddedDocuments).not.toHaveBeenCalled();
  });

  it('broken and masterwork AEs coexist independently — sync does not affect the other type', async () => {
    const brokenAe = mkBrokenAe({ id: 'b1', disabled: true });
    const mwAe = mkMasterworkAe({ id: 'mw1', disabled: true });
    const item = mkItem('weapon', [brokenAe, mwAe]);
    await syncMasterworkAeState(item as any, true); // only masterwork
    expect(item.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
      { _id: 'mw1', disabled: false },
    ]);
    // Broken AE is NOT included in the update
    const updateArgs = item.updateEmbeddedDocuments.mock.calls[0][1] as { _id: string }[];
    expect(updateArgs.some((u) => u._id === 'b1')).toBe(false);
  });
});
