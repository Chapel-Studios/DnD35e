<template>
  <div class="container-inventory-tab">
    <h2 class="sheet-tab-header">
      {{ title }}
    </h2>
    <CoinageFormGroup
      field-path="system.containedCurrency"
      class="contained-currency grid-full-row"
    />
    <InventoryListTable
      :items="contents"
      :container-uuid="documentUuid"
      :owner-uuid="parentUuid"
      empty-label="dnd35e.CONTAINER.ContentsEmpty"
      variant="container"
      class="container-contents"
    />
  </div>
</template>

<script setup lang="ts">
  import InventoryListTable from '@actors/baseActor/sheet/components/InventoryListTable.vue';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { CoinageFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  import type { ContainerStore } from '../ContainerStore.mjs';

  const {
    documentGetters: { contents, documentUuid, parentUuid },
  } = inject(DocumentSheetStoreSymbol) as ContainerStore;

  const title = game.i18n.localize('dnd35e.CONTAINER.Contents');
</script>

<style scoped lang="scss">
  .container-inventory-tab {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 0.5rem;
  }
</style>
