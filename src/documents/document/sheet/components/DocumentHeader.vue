<template>
  <div class="doc-header">
    <slot>
      <HeaderNameField />
    </slot>

    <div class="doc-status-area">
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

  const { documentGetters: { localizedType } } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;
</script>

<style scoped lang="scss">
  .doc-header {
    display: grid;
    grid-template-columns: minmax(auto, 1fr) 3fr minmax(80px, auto);
    grid-template-rows: min-content auto;
    margin-bottom: 0.5rem;
    align-items: start;

    & > :first-child {
      aspect-ratio: 1;
    }
  }

  :global(.actor-sheet.sheet .doc-status-area)  {
    display: none;
  }

  .doc-status-area {
    display: grid;
    margin: 0;
    grid-gap: 0.5rem 0;
    color: #7a7971;
    grid-template-rows: min-content;
    height: fit-content;
    align-self: start;
  }

  .doc-header .doc-type {
    font-size: 1.5rem;
    line-height: 1.6125rem;
    text-align: center;
    margin: 0;
  }

  // Ancestor (.actor-sheet) lives outside this component, so wrap it in :global()
  // to opt out of scoping while keeping .doc-header scoped to this component.
  :global(.actor-sheet) .doc-header {
    grid-template-columns: 10.25rem 3fr minmax(80px, auto);
    grid-template-rows: min-content auto;
  }
</style>
