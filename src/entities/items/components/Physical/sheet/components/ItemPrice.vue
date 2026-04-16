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
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { ItemPriceFormGroup } from '@vc/Fields/index.mjs';
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
<style lang="scss" scoped>
  .view-mode .form-group.item-price.price-form-group {
    grid-template-columns: minmax(max-content, 2fr) 5fr;
  }
  // .item-price {
  //   grid-column: 1 / -1;
  //   display: flex !important;
  // }
</style>