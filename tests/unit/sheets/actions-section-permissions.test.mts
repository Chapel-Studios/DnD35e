// @vitest-environment happy-dom

vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
  defaultDetailsTab: {},
}));
vi.mock('@items/physical/weapon/actions/RangedAttack/RangedAttackDataModel.mjs', () => ({
  RangedWeaponAttack: class {},
}));

import ActionsSection from '@actors/creature/sheet/tabs/sections/actions/ActionsSection.vue';
import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
import type { IAction } from '@items/baseItem/actions/types.mjs';
import { weaponItemType } from '@items/itemTypes.mjs';
import { SettingsStoreSymbol } from '@settings/index.mjs';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';

/**
 * Rows are sourced from `actorActions` (the actor-side `IAction` stub aggregation) and
 * resolved back to a live weapon/action via `itemUuid` - mirrors `createActionChange()`'s
 * actual aggregation, where a critically broken action simply has no stub at all. Each
 * fixture weapon/action here must be paired with its own `IAction` stub in `actorActions`
 * to appear as a row, same as in production.
 */
const mountSection = () => {
  const isSheetEditable = ref(true);
  const useActionFromSheet = vi.fn();
  const action = {
    _id: 'attack-1',
    type: 'melee_weapon_attack',
    isTopLevel: true,
    attackFormula: { resolvedValue: '1d20 + 4' },
    damageFormula: { resolvedValue: '1d8 + 2' },
    critRange: 20,
    damageTypeLabel: 'dnd35e.DAMAGE_TYPES.Slashing',
  };
  const weapon = {
    id: 'weapon-1',
    uuid: 'Actor.fixture.Item.weapon-1',
    type: weaponItemType,
    name: 'Test Sword',
    system: { isCarried: true, containerUuid: null as string | null, actions: [action] },
  };
  const items = ref([weapon]);
  const actorActions = ref<IAction[]>([
    { id: 'attack-1', itemUuid: weapon.uuid, type: 'melee_weapon_attack', isSystem: true },
  ]);
  const wrapper = mount(ActionsSection, {
    global: {
      provide: {
        [DocumentSheetStoreSymbol]: {
          documentGetters: {
            physicalItems: computed(() => items.value),
            actorActions: computed(() => actorActions.value),
          },
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
  return { wrapper, isSheetEditable, useActionFromSheet, items, actorActions };
};

describe('ActionsSection permissions', () => {
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

  it('omits an action whose stub is absent from actorActions (critical preparation issue), keeping healthy siblings', async () => {
    const { wrapper, items, actorActions } = mountSection();
    const weapon = items.value[0];
    // The item still carries the broken action's own data (e.g. so the GM can still see
    // and fix it from the weapon's own diagnostics tab) - but `createActionChange()` never
    // pushed a stub for it onto the actor, so it must never render here either.
    weapon.system.actions.push({
      ...weapon.system.actions[0],
      _id: 'broken-attack',
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('.weapon-row')).toHaveLength(1);
    expect(wrapper.get('.weapon-row').attributes('data-action-id')).toBe('attack-1');
    expect(wrapper.find('[data-action-id="broken-attack"]').exists()).toBe(false);

    // Confirms it's the missing stub (not some other filter) gating the row: adding a
    // matching stub makes it appear.
    actorActions.value.push({ id: 'broken-attack', itemUuid: weapon.uuid, type: 'melee_weapon_attack', isSystem: true });
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.weapon-row')).toHaveLength(2);
    wrapper.unmount();
  });

  it('distinguishes same-named weapons across carry states as subcategories within one category', async () => {
    const { wrapper, items, actorActions } = mountSection();
    const original = items.value[0];
    const stowedWeapon = {
      ...original,
      id: 'stowed-weapon',
      uuid: 'Actor.fixture.Item.stowed-weapon',
      system: {
        isCarried: true,
        isEquipped: false,
        containerUuid: 'Actor.fixture.Item.bag',
        actions: [
          { ...original.system.actions[0], _id: 'stowed-attack' },
          { ...original.system.actions[0], _id: 'chained-attack', isTopLevel: false },
        ],
      },
    };
    items.value.push(stowedWeapon);
    actorActions.value.push(
      { id: 'stowed-attack', itemUuid: stowedWeapon.uuid, type: 'melee_weapon_attack', isSystem: true },
      { id: 'chained-attack', itemUuid: stowedWeapon.uuid, type: 'melee_weapon_attack', isSystem: true }
    );
    await wrapper.vm.$nextTick();

    // Both weapons share one action type (melee), so only one top-level category tab
    // exists alongside "All" - carry state is a subcategory within it, not its own tab.
    expect(wrapper.findAll('.weapon-row')).toHaveLength(2);
    expect(wrapper.findAll('.category-tab-btn')).toHaveLength(2);
    expect(wrapper.find('[data-item-id="stowed-weapon"] .weapon-location').exists()).toBe(true);
    expect(wrapper.find('[data-item-id="weapon-1"] .weapon-location').exists()).toBe(false);

    const subcategoryLabels = wrapper.findAll('.subcategory-heading-btn').map((btn) => btn.find('span').text());
    expect(subcategoryLabels).toEqual(['dnd35e.ACTOR.actions.subcategory.ready', 'dnd35e.ACTOR.actions.subcategory.stowed']);

    await wrapper.findAll('.category-tab-btn')[1].trigger('click');
    expect(wrapper.findAll('.weapon-row')).toHaveLength(2);

    items.value[0].system.isCarried = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.weapon-row')).toHaveLength(1);
    expect(wrapper.get('.weapon-row').attributes('data-item-id')).toBe('stowed-weapon');
    expect(wrapper.findAll('.category-tab-btn')).toHaveLength(2);

    items.value[1].system.isCarried = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.weapon-row')).toHaveLength(0);
    expect(wrapper.findAll('.category-tab-btn')).toHaveLength(1);
    wrapper.unmount();
  });

  it('separates melee and ranged actions into their own top-level categories, with equipped as a carry-state subcategory', async () => {
    const { wrapper, items, actorActions } = mountSection();
    const original = items.value[0];
    const equippedWeapon = {
      ...original,
      id: 'equipped-weapon',
      uuid: 'Actor.fixture.Item.equipped-weapon',
      system: {
        isCarried: true,
        isEquipped: true,
        containerUuid: null as string | null,
        actions: [{ ...original.system.actions[0], _id: 'equipped-attack' }],
      },
    };
    const rangedWeapon = {
      ...original,
      id: 'ranged-weapon',
      uuid: 'Actor.fixture.Item.ranged-weapon',
      system: {
        isCarried: true,
        isEquipped: false,
        containerUuid: null as string | null,
        actions: [{ ...original.system.actions[0], _id: 'ranged-attack', type: 'ranged_weapon_attack' }],
      },
    };
    items.value.push(equippedWeapon, rangedWeapon);
    actorActions.value.push(
      { id: 'equipped-attack', itemUuid: equippedWeapon.uuid, type: 'melee_weapon_attack', isSystem: true },
      { id: 'ranged-attack', itemUuid: rangedWeapon.uuid, type: 'ranged_weapon_attack', isSystem: true }
    );
    await wrapper.vm.$nextTick();

    // All, Melee Attack, Ranged Attack.
    const categoryLabels = wrapper.findAll('.category-tab-btn').map((btn) => btn.find('span').text());
    expect(categoryLabels).toEqual([
      'dnd35e.ACTOR.inventory.tab.all',
      'dnd35e.WEAPON.ACTIONS.Type.melee_weapon_attack',
      'dnd35e.WEAPON.ACTIONS.Type.ranged_weapon_attack',
    ]);

    await wrapper.findAll('.category-tab-btn')[1].trigger('click');
    const meleeSubcategoryLabels = wrapper.findAll('.subcategory-heading-btn').map((btn) => btn.find('span').text());
    expect(meleeSubcategoryLabels).toEqual([
      'dnd35e.ACTOR.actions.subcategory.equipped',
      'dnd35e.ACTOR.actions.subcategory.ready',
    ]);
    wrapper.unmount();
  });
});
