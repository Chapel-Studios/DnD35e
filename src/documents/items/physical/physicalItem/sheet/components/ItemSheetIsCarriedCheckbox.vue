<template>
  <CheckBoxFormGroup
    v-if="hasOwner"
    field-path="system.isCarried"
    disabled
  />
</template>
<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { PhysicalDocumentStore } from '@items/physical/physicalItem/index.mjs';
  import { CheckBoxFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: {
      hasOwner,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;
</script>
