<template>
  <div class="container-inventory-tab">
    <InventoryListTable
      :items="contents"
      :container-uuid="documentUuid"
      :owner-uuid="parentUuid"
      title="dnd35e.CONTAINER.Contents"
      empty-label="dnd35e.CONTAINER.ContentsEmpty"
      variant="container"
    />
  </div>
</template>

<script setup lang="ts">
  import InventoryListTable from '@actors/baseActor/sheet/components/InventoryListTable.vue';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { inject } from 'vue';

  import type { ContainerStore } from '../ContainerStore.mjs';

  const {
    documentGetters: { contents, documentUuid, parentUuid },
  } = inject(DocumentSheetStoreSymbol) as ContainerStore;
</script>

<style scoped lang="scss">
  .container-inventory-tab {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
</style>
