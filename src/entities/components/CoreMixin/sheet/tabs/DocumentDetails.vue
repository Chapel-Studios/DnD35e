<template>
  <section
    class="overview"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="details"
  >
    <div class="form-container">
      <DescriptionEditor />

      <slot></slot>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { DescriptionEditor } from '@ec/CoreMixin/index.mjs';
  import type { TabStore } from '@ec/CoreMixin/index.mjs';
  import { TabStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { inject } from 'vue';

  const { getIsTabOpen } = inject(TabStoreSymbol) as TabStore;
  const isActiveTab = getIsTabOpen('details');
</script>

<style scoped>
  .form-container {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 1rem 3rem;
    align-items: center;
  }

  .form-header {
    grid-column: span 2;
    margin: 1rem 0 0.25rem;
    text-decoration: underline;
  }

  .notes {
    margin: -0.75rem 0 0.125rem;
    grid-column: span 2;
  }

  .form-group {
    display: contents;
  }
</style>
