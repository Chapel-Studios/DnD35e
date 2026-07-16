<template>
  <div class="container-summary">
    <span class="count">{{ contentsCount }} {{ itemsLabel }}</span>
  </div>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { inject } from 'vue';

  import type { ContainerStore } from '../ContainerStore.mjs';

  const {
    documentGetters: { contentsCount },
  } = inject(DocumentSheetStoreSymbol) as ContainerStore;

  const itemsLabel = game.i18n.localize('dnd35e.CONTAINER.ContentsCount');
</script>

<style scoped lang="scss">
  .container-summary {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;

    .count {
      opacity: 0.75;
    }
  }
</style>
