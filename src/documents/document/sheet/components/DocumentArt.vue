<template>
  <div class="doc-art-container">
    <ImageField field="img" :title="name" class="doc-art" />
  </div>
</template>

<script lang="ts" setup>
  import { type DocumentSheetStore,DocumentSheetStoreSymbol } from '@documents/document/sheet/DocumentSheetStore.mjs';
  import ImageField from '@vc/fields/ImageField.vue';
  import { inject } from 'vue';

  const {
    documentGetters: {
      name,
    },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;
</script>

<style scoped lang="scss">
  .doc-art-container {
    width: 8rem;
    position: relative;
    grid-row: span 2;

    img.doc-art {
      object-fit: contain;
      border: 2px solid #000;
    }
  }

  // Ancestor (.actor-sheet) lives outside this component, so wrap it in :global()
  // to opt out of scoping while keeping .doc-art-container scoped to this component.
  :global(.actor-sheet) .doc-art-container {
    width: 10rem;
  }
</style>
