<template>
  <CheckBoxFormGroup
    :value="isWeightlessWhenEquipped"
    :on-update="updater"
    field-path="system.isWeightlessWhenEquipped"
  />
</template>
<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { EquippableDocumentStore } from '@items/physical/equippableItem/index.mjs';
  import { CheckBoxFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: {
      isWeightlessWhenEquipped,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as EquippableDocumentStore;

  const updater = getDirectFieldUpdater('system.isWeightlessWhenEquipped');
</script>
