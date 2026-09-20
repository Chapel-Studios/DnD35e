<template>
  <section
    class="weapon-actions-tab"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="actions"
  >
    <ActionsEditorList />
  </section>
</template>

<script setup lang="ts">
  import type { TabStore } from '@documents/document/index.mjs';
  import { TabStoreSymbol } from '@documents/document/index.mjs';
  import ActionsEditorList from '@items/baseItem/sheet/components/actions/ActionsEditorList.vue';
  import { inject } from 'vue';

  const { getIsTabOpen } = inject(TabStoreSymbol) as TabStore;
  const isActiveTab = getIsTabOpen('actions');
</script>

<style scoped lang="scss">
  .weapon-actions-tab {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .action-accordion-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
</style>
