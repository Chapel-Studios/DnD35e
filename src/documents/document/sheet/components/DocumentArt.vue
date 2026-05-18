<template>
  <div class="item-art-container">
    <ImageField field="img" :title="name" class="item-art" />
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
  .item-art-container {
    flex: 0 128px;
    width: 128px;
    position: relative;
    grid-row: span 2;

    img.item-art {
      object-fit: contain;
      border: 2px solid #000;
    }
  }
</style>
