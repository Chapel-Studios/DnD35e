<template>
  <SelectFormGroup
    label="D35E.DesignedForSize"
    :value="designedForSize"
    :options="SIZE_SELECT_OPTIONS"
    field-path="system.designedForSize"
  />
</template>
<script setup lang="ts">
  import { SIZE_SELECT_OPTIONS } from '@constants/sizes.mjs';
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { EquippableDocumentStore } from '@items/components/Equippable/index.mjs';
  import { SelectFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: {
      designedForSize,
    },
  } = inject(DocumentSheetStoreSymbol) as EquippableDocumentStore;
</script>
