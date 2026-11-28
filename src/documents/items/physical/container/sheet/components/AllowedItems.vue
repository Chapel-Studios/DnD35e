<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { ItemType } from '@items/index.mjs';
  import { ammoItemType, containerItemType, ITEM_TYPES_LOCALIZED, ItemTypeSelectOptions, weaponItemType } from '@items/itemTypes.mjs';
  import { AMMO_TYPE_SELECT_OPTIONS, AMMO_TYPES } from '@items/physical/ammo/index.mjs';
  import { useBaseWeaponNames } from '@items/physical/weapon/sheet/useBaseWeaponNames.mjs';
  import type { MultiSelectFormGroupProps, SelectOption } from '@vc/fields/formGroups/types.mjs';
  import { MultiSelectFormGroup } from '@vc/fields/index.mjs';
  import { computed, inject } from 'vue';

  import { CONTAINER_TYPES, ContainerTypeSelectOptions } from '../../data/constants.mjs';
  import type { ContainerStore } from '../index.mjs';

  const {
    documentGetters: { allowedItemTypes, allowedItemSubtypes },
    documentActions: { getViewAwareFieldUpdater },
  } = inject(DocumentSheetStoreSymbol) as ContainerStore;
  const allowedItemTypesUpdater = getViewAwareFieldUpdater('system.allowedItemTypes');
  const allowedItemSubtypesUpdater = getViewAwareFieldUpdater('system.allowedItemSubtypes');

  const baseWeaponNames = useBaseWeaponNames();

  const optionValues = {
    [weaponItemType]: computed(() => [...(new Set(allowedItemSubtypes.value).intersection(baseWeaponNames.value))]),
    [ammoItemType]: computed(() => [...(new Set(allowedItemSubtypes.value).intersection(new Set(AMMO_TYPES)))]),
    [containerItemType]: computed(() => [...(new Set(allowedItemSubtypes.value).intersection(new Set(CONTAINER_TYPES)))]),
  };

  // remove unused subtypes, if all types are removed null both fields
  const syncTypesAndSubtypes = async (newValues: ItemType[]) => {
    if (!newValues.length) {
      await allowedItemSubtypesUpdater(null);
      await allowedItemTypesUpdater(null);

      return;
    }

    const removedItemTypes = allowedItemTypes.value?.filter(x => !newValues.includes(x)) || [];
    let newSubtypes = allowedItemSubtypes.value || [];
    for (const type of removedItemTypes) {
      const invalidOptions = optionValues[type].value;
      newSubtypes = newSubtypes.filter(x => !invalidOptions.includes(x))
        || [];
    }
    if (newSubtypes.length !== allowedItemSubtypes.value?.length) {
      await allowedItemSubtypesUpdater(newSubtypes);
    }

    await allowedItemTypesUpdater(newValues);
  };

  const mergeSubtypeUpdates = async (type: ItemType, newValues: string[]) => {
    const current = allowedItemSubtypes.value || [];
    await allowedItemSubtypesUpdater([
      ...current.filter(x => !optionValues[type].value.includes(x)),
      ...newValues,
    ]);
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
      value: optionValues[type].value,
      onUpdate: (vals) => mergeSubtypeUpdates(type, vals),
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
