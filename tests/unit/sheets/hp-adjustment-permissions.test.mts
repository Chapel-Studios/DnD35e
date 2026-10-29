import { getHpAdjustmentPermissions, isHpAdjustmentType } from '@actors/creature/sheet/components/hpAdjustmentPermissions.mjs';
import type { FieldOverrides } from '@vc/fields/formGroups/fieldPermissions.mjs';
import { describe, expect, it } from 'vitest';

describe('HP adjustment permissions', () => {
  it('permits owners by default and denies non-owners even with everyone visibility', () => {
    const actor = { getFlag: () => ({ system__hp: { visibility: 'everyone' } }) };
    for (const permission of Object.values(getHpAdjustmentPermissions(actor, true, false))) {
      expect(permission).toEqual({ visible: true, editable: true });
    }
    for (const permission of Object.values(getHpAdjustmentPermissions(actor, false, false))) {
      expect(permission).toEqual({ visible: false, editable: false });
    }
  });

  it('maps damage/healing to current HP independently of temp and nonlethal locks', () => {
    const actor = {
      getFlag: () => ({
        system__hp__temp: { editability: 'gmOnly' },
        system__hp__nonlethal: { visibility: 'gmOnly' },
      }),
    };
    const permissions = getHpAdjustmentPermissions(actor, true, false);
    expect(permissions.damage).toEqual({ visible: true, editable: true });
    expect(permissions.healing).toEqual(permissions.damage);
    expect(permissions.temporary).toEqual({ visible: true, editable: false });
    expect(permissions.nonlethal).toEqual({ visible: false, editable: false });
  });

  it('cascades parent restrictions and grants GMs access despite overrides', () => {
    const actor = {
      getFlag: () => ({
        system__hp: { visibility: 'gmOnly', editability: 'gmOnly' },
        system__hp__current: { visibility: 'everyone', editability: 'normal' },
      }),
    };
    for (const permission of Object.values(getHpAdjustmentPermissions(actor, true, false))) {
      expect(permission).toEqual({ visible: false, editable: false });
    }
    for (const permission of Object.values(getHpAdjustmentPermissions(actor, false, true))) {
      expect(permission).toEqual({ visible: true, editable: true });
    }
  });

  it('reads live flags rather than retaining the previous permission result', () => {
    const flags: FieldOverrides = {};
    const actor = { getFlag: () => flags };
    expect(getHpAdjustmentPermissions(actor, true, false).damage.editable).toBe(true);
    flags.system__hp__current = { editability: 'gmOnly' };
    expect(getHpAdjustmentPermissions(actor, true, false).damage.editable).toBe(false);
    flags.system__hp__current = { visibility: 'gmOnly' };
    expect(getHpAdjustmentPermissions(actor, true, false).healing.visible).toBe(false);
  });

  it('honors schema defaults and explicit overrides over those defaults', () => {
    const flags: FieldOverrides = {};
    class System {
      static schema = {
        getField: (path: string) => path === 'hp.current'
          ? { options: { defaultEditability: 'gmOnly' } }
          : undefined,
      };
    }
    const actor = { system: new System(), getFlag: () => flags };
    expect(getHpAdjustmentPermissions(actor, true, false).damage.editable).toBe(false);
    flags.system__hp__current = { editability: 'normal' };
    expect(getHpAdjustmentPermissions(actor, true, false).damage.editable).toBe(true);
  });

  it.each(['damage', 'healing', 'temporary', 'nonlethal'])('accepts supported type %s', (type) => {
    expect(isHpAdjustmentType(type)).toBe(true);
  });

  it.each(['invalid', '', undefined])('rejects unknown adjustment type %s', (type) => {
    expect(isHpAdjustmentType(type)).toBe(false);
  });
});
