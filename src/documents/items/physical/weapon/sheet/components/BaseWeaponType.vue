<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { CheckBoxFormGroupProps, SelectFormGroupProps, SelectOption } from '@vc/fields/formGroups/types.mjs';
  import { CheckBoxFormGroup, SelectFormGroup } from '@vc/fields/index.mjs';
  import { computed, inject, onMounted, ref } from 'vue';

  import { BaseWeaponNameCache } from '../../logic/BaseWeaponNameCache.mjs';
  import type { WeaponStore } from '../WeaponStore.mjs';

  const {
    documentGetters: {
      isBaseWeaponType,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as WeaponStore;
  const baseTypeUpdater = getViewAwareFieldUpdater('system.weaponBaseType');
  const isBaseUpdater = getViewAwareFieldUpdater('system.isBaseWeaponType');

  const isbaseTypeProps: CheckBoxFormGroupProps = {
    fieldPath: 'system.isBaseWeaponType',
    onUpdate: (newValue) => {
      if (newValue) void baseTypeUpdater('');
      void isBaseUpdater(newValue);
    },
  };

  // Keep setup synchronous: this sheet has no Suspense boundary.
  const baseNames = ref<Set<string>>(new Set());

  onMounted(async () => {
    baseNames.value = await BaseWeaponNameCache.getNames();
  });

  const basetypeProps = computed<SelectFormGroupProps<string>>(() => ({
    fieldPath: 'system.weaponBaseType',
    options: [...baseNames.value].map(n => ({ label: n, value: n } as SelectOption<string>)),
  }));
</script>

<template>
  <div class="base-weapon-type">
    <CheckBoxFormGroup v-bind="isbaseTypeProps" />
    <SelectFormGroup
      v-if="!isBaseWeaponType"
      v-bind="basetypeProps"
      class="base-type-selector"
    />
  </div>
</template>

<style lang="scss" scoped>
  .base-weapon-type {
    display: contents;

    .base-type-selector {
      grid-column: span 2;
    }
  }
</style>
