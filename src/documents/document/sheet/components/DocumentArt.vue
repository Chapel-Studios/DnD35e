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
  .actor-sheet .doc-art-container {
    width: 10rem;
  }

  .doc-art-container {
    width: 8rem;
    position: relative;
    grid-row: span 2;

    img.doc-art {
      object-fit: contain;
      border: 2px solid #000;
    }
  }
</style>
