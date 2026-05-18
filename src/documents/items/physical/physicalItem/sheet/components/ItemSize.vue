<template>
  <SelectFormGroup
    label="dnd35e.SIZE.Size"
    :value="size"
    :options="SIZE_SELECT_OPTIONS"
    field-path="system.size"
  />
</template>
<script setup lang="ts">
  import { SIZE_SELECT_OPTIONS } from '@constants/sizes.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { PhysicalDocumentStore } from '@items/physical/physicalItem/index.mjs';
  import { SelectFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: {
      size,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;
</script>
