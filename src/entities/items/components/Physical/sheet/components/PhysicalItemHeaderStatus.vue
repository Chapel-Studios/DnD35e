<template>
  <div v-if="isCarried" class="header-status-badge">
    <i class="fas fa-bag-check" />
    {{ carriedLabel }}
  </div>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { inject } from 'vue';

  const store = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;

  const { isCarried } = store.documentGetters;
  const carriedLabel = game.i18n.localize('dnd35e.PHYSICAL_ITEM.FIELDS.isCarried.label');
</script>

<style scoped lang="scss">
  .header-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.875rem;
    color: var(--color-text-light);
    background: var(--color-shadow);
    padding: 0.25rem 0.6rem;
    border-radius: 0.25rem;

    i {
      opacity: 0.8;
    }
  }
</style>
