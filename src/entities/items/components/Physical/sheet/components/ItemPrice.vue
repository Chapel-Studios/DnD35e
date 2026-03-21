<template>
  <ItemPriceFormGroup
    label="Price"
    :value="effectivePrice"
    :on-update="priceUpdater"
    field-path="system.price"
    class="item-price"
  />
</template>
<script setup lang="ts">
  import { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { ItemPriceFormGroup } from '@vc/Fields/index.mjs';
  import { computed, inject } from 'vue';

  const documentSheetStore = inject('documentSheetStore') as PhysicalDocumentStore;
  
  const {
    documentGetters: {
      price,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = documentSheetStore as PhysicalDocumentStore;

  // View-aware price: shows override when viewing as unidentified
  const effectivePrice = computed(() => price.value);

  // View-aware updater: writes to override when editing in unidentified view
  const priceUpdater = getViewAwareFieldUpdater('system.price');
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