<template>
  <SelectFormGroup
    label="D35E.Size"
    :value="size"
    :options="SIZE_SELECT_OPTIONS"
    field-path="system.size"
  />
</template>
<script setup lang="ts">
  import { SIZE_SELECT_OPTIONS } from '@constants/sizes.mjs';
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { SelectFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: {
      size,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;
</script>
