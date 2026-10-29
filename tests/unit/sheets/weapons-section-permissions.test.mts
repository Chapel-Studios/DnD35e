// @vitest-environment happy-dom

vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));
vi.mock('@items/physical/weapon/actions/RangedAttack/RangedAttackDataModel.mjs', () => ({
  RangedWeaponAttack: class {},
}));

import WeaponsSection from '@actors/creature/sheet/tabs/sections/combat/WeaponsSection.vue';
import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
import { weaponItemType } from '@items/itemTypes.mjs';
import { SettingsStoreSymbol } from '@settings/index.mjs';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';

const mountSection = () => {
  const isSheetEditable = ref(true);
  const useActionFromSheet = vi.fn();
  const action = {
    _id: 'attack-1',
    isTopLevel: true,
    attackFormula: { resolvedValue: '1d20 + 4' },
    damageFormula: { resolvedValue: '1d8 + 2' },
    critRange: 20,
    damageType: 'dnd35e.DAMAGE_TYPES.Slashing',
  };
  const weapon = {
    id: 'weapon-1',
    type: weaponItemType,
    name: 'Test Sword',
    system: { isCarried: true, actions: [action] },
  };
  const wrapper = mount(WeaponsSection, {
    global: {
      provide: {
        [DocumentSheetStoreSymbol]: {
          documentGetters: { physicalItems: computed(() => [weapon]) },
          documentActions: { useActionFromSheet },
        },
        [RenderModeStoreSymbol]: { isSheetEditable: computed(() => isSheetEditable.value) },
        [SettingsStoreSymbol]: {
          measurement: {
            convertToLocalizedDistance: (distance: number) => String(distance),
            distanceDisplayShortLabel: computed(() => 'ft'),
          },
        },
      },
    },
  });
  return { wrapper, isSheetEditable, useActionFromSheet };
};

describe('WeaponsSection permissions', () => {
  it('disables attack actions on read-only sheets and guards the click handler', async () => {
    const { wrapper, isSheetEditable, useActionFromSheet } = mountSection();
    const button = wrapper.get('.attack-btn');

    expect(button.attributes('disabled')).toBeUndefined();
    isSheetEditable.value = false;
    await wrapper.vm.$nextTick();
    expect(button.attributes('disabled')).toBeDefined();

    (button.element as HTMLButtonElement).disabled = false;
    await button.trigger('click');
    expect(useActionFromSheet).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('allows attack actions when the sheet is editable', async () => {
    const { wrapper, useActionFromSheet } = mountSection();

    await wrapper.get('.attack-btn').trigger('click');
    expect(useActionFromSheet).toHaveBeenCalledWith('weapon-1', 'attack-1', undefined);
    wrapper.unmount();
  });
});
