const parent = vi.hoisted(() => ({
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@items/physical/equippableItem/index.mjs', () => ({
  EquippableItem: class {
    static LifeCycle = {};
    _onUpdate(...args: unknown[]) { return parent.update(...args); }
    _onDelete(...args: unknown[]) { parent.delete(...args); }
  },
}));
vi.mock('@items/physical/weapon/logic/weaponActionSync.mjs', () => ({
  syncWeaponActions: vi.fn(),
}));

import { BaseWeaponNameCache } from '@items/physical/weapon/logic/BaseWeaponNameCache.mjs';
import type { WeaponSource } from '@items/physical/weapon/Weapon.mjs';
import { Weapon } from '@items/physical/weapon/Weapon.mjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

class TestWeapon extends Weapon {
  updateForTest(data: Partial<WeaponSource>) {
    return this._onUpdate(data as DeepPartial<this['_source']>, {}, 'gm');
  }

  deleteForTest() {
    this._onDelete({}, 'gm');
  }
}

const makeWeapon = () => {
  const weapon = Object.create(TestWeapon.prototype) as TestWeapon;
  Object.defineProperty(weapon, 'pack', { value: 'dnd35e.weapons' });
  weapon.system = { isBaseWeaponType: true } as Weapon['system'];
  return weapon;
};

describe('Weapon base-name lifecycle', () => {
  afterEach(() => vi.restoreAllMocks());

  it('invalidates the cache for a name-only compendium update', async () => {
    const invalidate = vi.spyOn(BaseWeaponNameCache, 'invalidate');
    await makeWeapon().updateForTest({ name: 'Renamed Axe' });

    expect(invalidate).toHaveBeenCalledOnce();
  });

  it('preserves parent deletion cleanup while invalidating base names', () => {
    const invalidate = vi.spyOn(BaseWeaponNameCache, 'invalidate');
    makeWeapon().deleteForTest();

    expect(parent.delete).toHaveBeenCalledWith({}, 'gm');
    expect(invalidate).toHaveBeenCalledOnce();
  });
});
