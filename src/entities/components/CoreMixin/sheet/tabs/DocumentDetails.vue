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
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import DescriptionEditor from '@ec/CoreMixin/sheet/components/DescriptionEditor.vue';
  import { inject } from 'vue';

  const store = inject('documentSheetStore') as DocumentSheetStore;
  const {
    tabs: {
      tabGetters: { getIsTabOpen },
    },
  } = store;

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
