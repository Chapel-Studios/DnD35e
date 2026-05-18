<template>
  <ItemPriceFormGroup
    label="Price"
    :value="price"
    field-path="system.price"
    class="item-price grid-full-row"
    :direct-update="props.directUpdate"
  />
</template>
<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { ItemPriceFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  const props = defineProps<{
    /** When true and no onUpdate, uses the store's direct field updater instead of view-aware. */
    directUpdate?: boolean;
  }>();

  const {
    documentGetters: {
      price,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;
</script>
<!-- Styles live in src/styles/core.scss — see price form group comment there for why. -->