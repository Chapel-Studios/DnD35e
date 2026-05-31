<template>
  <div class="doc-header">
    <slot>
      <HeaderNameField />
    </slot>

    <div v-if="showStatusArea" class="doc-status-area">
      <h4 class="doc-type">{{localizedType}}</h4>
      <slot name="status"></slot>
    </div>
    <slot name="summary"></slot>
  </div>
</template>

<script lang="ts" setup>
  import { type DocumentSheetStore,DocumentSheetStoreSymbol } from '@documents/document/sheet/DocumentSheetStore.mjs';
  import { inject } from 'vue';

  import HeaderNameField from './HeaderNameField.vue';

  withDefaults(defineProps<{
    showStatusArea?: boolean;
  }>(), {
    showStatusArea: true,
  });

  const { documentGetters: { localizedType } } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;
</script>

<style scoped lang="scss">
  .actor-sheet .doc-header {
    grid-template-columns: 10.25rem 3fr minmax(80px, auto);
  }
  .doc-header {
    display: grid;
    grid-template: auto / 8.25rem 3fr minmax(80px, auto);
    margin-bottom: 0.5rem;
  }

  .doc-status-area {
    flex: 0 0 80px;
    margin: 0;
    padding: 0.25rem 1rem 1rem;
    color: #7a7971;
  }

  .doc-header .doc-type {
    font-size: 24px;
    line-height: 26px;
    text-align: center;
    margin-bottom: 0.5rem;
  }
</style>
