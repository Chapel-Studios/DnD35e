<template>
  <NumberFormGroup
    :value="hardness"
    field-path="system.hardness"
    :direct-update="props.directUpdate"
  />
</template>
<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const props = defineProps<{
    /** When true uses the store's direct field updater instead of view-aware. */
    directUpdate?: boolean;
  }>();

  const {
    documentGetters: {
      hardness,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;
</script>
