<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { ItemType } from '@items/index.mjs';
  import {
    ammoItemType,
    containerItemType,
    ITEM_TYPES_LOCALIZED,
    ItemTypeSelectOptions,
    PHYSICAL_ITEM_TYPES,
    weaponItemType,
  } from '@items/itemTypes.mjs';
  import { AMMO_TYPE_SELECT_OPTIONS } from '@items/physical/ammo/index.mjs';
  import { useBaseWeaponNames } from '@items/physical/weapon/sheet/useBaseWeaponNames.mjs';
  import type { MultiSelectFormGroupProps, SelectOption } from '@vc/fields/formGroups/types.mjs';
  import { MultiSelectFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  import { ContainerTypeSelectOptions } from '../../data/constants.mjs';
  import type { ContainerStore } from '../index.mjs';

  const {
    documentGetters: { allowedItemTypes, allowedItemSubtypes },
    documentActions: { viewModeAwareUpdateDocument },
  } = inject(DocumentSheetStoreSymbol) as ContainerStore;

  const baseWeaponNames = useBaseWeaponNames();

  const syncTypesAndSubtypes = async (newValues: ItemType[]) => {
    const update: Record<string, unknown> = {
      'system.allowedItemTypes': newValues.length
        ? newValues
        : null,
    };
    for (const type of PHYSICAL_ITEM_TYPES) {
      if (!newValues.includes(type)) update[`system.allowedItemSubtypes.${type}`] = null;
    }
    await viewModeAwareUpdateDocument(update);
  };

  const itemTypeFilterProps: MultiSelectFormGroupProps<ItemType> = {
    fieldPath: 'system.allowedItemTypes',
    options: [...ItemTypeSelectOptions]
      .sort((a, b) => a.label.localeCompare(b.label)),
    onUpdate: syncTypesAndSubtypes,
  };

  const getItemSubtypeFilterProps = (type: ItemType): MultiSelectFormGroupProps<string> => {
    const typeLabel = game.i18n.localize(ITEM_TYPES_LOCALIZED[type]);
    const result: MultiSelectFormGroupProps<string> = {
      fieldPath: `system.allowedItemSubtypes.${type}`,
      options: [],
      value: allowedItemSubtypes.value[type],
      label: game.i18n.format('dnd35e.CONTAINER.filtering.subtypeFilterLabel', { type: typeLabel }),
    };

    if (type === weaponItemType) {
      result.options = [...baseWeaponNames.value]
        .map(x => ({ label: x, value: x || 'empty' } as SelectOption<string>));
    }
    else if (type === ammoItemType) {
      result.options = [...AMMO_TYPE_SELECT_OPTIONS];
    }
    else if (type === containerItemType) {
      result.options = [...ContainerTypeSelectOptions];
    }
    else {
      console.error('Item type not set up in AllowedItems');
    }

    result.options.sort((a, b) => a.label.localeCompare(b.label));

    return result;
  };
</script>

<template>
  <div class="allowed-items">
    <MultiSelectFormGroup
      v-bind="itemTypeFilterProps"
      class="grid-full-row"
    />
    <MultiSelectFormGroup
      v-for="allowedType in allowedItemTypes"
      :key="allowedType"
      v-bind="getItemSubtypeFilterProps(allowedType)"
      class="grid-full-row"
    />
  </div>
</template>

<style lang="scss" scoped>
  .allowed-items {
    display: contents;
  }
</style>
