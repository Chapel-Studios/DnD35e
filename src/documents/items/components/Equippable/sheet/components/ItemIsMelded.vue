<template>
  <CheckBoxFormGroup
    :value="isMelded"
    :on-update="updater"
    field-path="system.isMelded"
  />
</template>
<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { EquippableDocumentStore } from '@items/components/Equippable/index.mjs';
  import { CheckBoxFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: {
      isMelded,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as EquippableDocumentStore;

  const updater = getDirectFieldUpdater('system.isMelded');
</script>
