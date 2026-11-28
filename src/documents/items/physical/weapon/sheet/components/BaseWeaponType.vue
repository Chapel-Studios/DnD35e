<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { CheckBoxFormGroupProps, SelectFormGroupProps, SelectOption } from '@vc/fields/formGroups/types.mjs';
  import { CheckBoxFormGroup, FormGroupSection, SelectFormGroup } from '@vc/fields/index.mjs';
  import { computed, inject } from 'vue';

  import { useBaseWeaponNames } from '../useBaseWeaponNames.mjs';
  import type { WeaponStore } from '../WeaponStore.mjs';

  const {
    documentGetters: {
      isBaseWeaponType,
      getIsFieldEditable,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as WeaponStore;
  const baseTypeUpdater = getViewAwareFieldUpdater('system.weaponBaseType');
  const isBaseUpdater = getViewAwareFieldUpdater('system.isBaseWeaponType');
  const isBaseEditable = getIsFieldEditable('system.isBaseWeaponType');

  const isbaseTypeProps: CheckBoxFormGroupProps = {
    fieldPath: 'system.isBaseWeaponType',
    onUpdate: (newValue) => {
      if (newValue) void baseTypeUpdater('');
      void isBaseUpdater(newValue);
    },
  };

  const baseNames = useBaseWeaponNames();

  const basetypeProps = computed<SelectFormGroupProps<string>>(() => ({
    fieldPath: 'system.weaponBaseType',
    readOnly: !isBaseEditable.value,
    options: [
      { label: 'dnd35e.COMMON.None', value: '' },
      ...[...baseNames.value].map(n => ({ label: n, value: n } as SelectOption<string>)),
    ],
  }));
</script>

<template>
  <FormGroupSection
    label="dnd35e.WEAPON.FIELDS.weaponBaseType.label"
    field-path="system.isBaseWeaponType"
    class="base-weapon-type"
  >
    <CheckBoxFormGroup v-bind="isbaseTypeProps" hide-field-controls />
    <SelectFormGroup
      v-if="!isBaseWeaponType"
      v-bind="basetypeProps"
      class="base-type-selector"
      hide-field-controls
    />
  </FormGroupSection>
</template>

<style lang="scss" scoped>
  .base-weapon-type {
    grid-column: span 2;
  }
</style>
