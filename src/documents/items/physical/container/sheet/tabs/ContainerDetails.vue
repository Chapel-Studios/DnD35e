<template>
  <DocumentDetails>
    <div class="container-details-container">
      <AllowedItems v-if="!isPurse" />
      <ItemPrice />
      <ItemHP />
      <ItemQuantity />
      <ItemWeight />
      <ItemSize />
      <ItemHardness />
      <ContainerCapacity />
      <AllowsCurrency v-if="!isPurse" />
      <ItemSheetIsCarriedCheckbox />
      <ItemSheetIsBrokenCheckbox />
      <ItemSheetContainerSelector />
    </div>
  </DocumentDetails>
</template>

<script setup lang="ts">
  import { DocumentDetails, DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import {
    ItemHardness,
    ItemHP,
    ItemPrice,
    ItemQuantity,
    ItemSheetContainerSelector,
    ItemSheetIsBrokenCheckbox,
    ItemSheetIsCarriedCheckbox,
    ItemSize,
    ItemWeight,
  } from '@items/physical/physicalItem/sheet/index.mjs';
  import { inject } from 'vue';

  import AllowedItems from '../components/AllowedItems.vue';
  import AllowsCurrency from '../components/AllowsCurrency.vue';
  import ContainerCapacity from '../components/ContainerCapacity.vue';
  import type { ContainerStore } from '../index.mjs';

  const {
    documentGetters: {
      isPurse,
    },
  } = inject(DocumentSheetStoreSymbol) as ContainerStore;
</script>

<style scoped lang="scss">
  .container-details-container {
    grid-column: span 2;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(125px, 1fr));
    gap: 0.66rem 0.5rem;

    :deep(.form-group) {
      grid-auto-flow: row;
    }

    :deep(.form-group input) {
      text-align: right;
    }
  }

  .grid-full-row {
    grid-column: 1 / -1;
  }
</style>
