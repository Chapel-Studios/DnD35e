<template>
  <div class="item-art-container">
    <ImageField field="img" :title="name" class="item-art" />
  </div>
</template>

<script lang="ts" setup>
  import { type DocumentSheetStore,DocumentSheetStoreSymbol } from '@ec/CoreMixin/sheet/DocumentSheetStore.mjs';
  import ImageField from '@vc/Fields/ImageField.vue';
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
    margin-right: 0.5rem;
    margin-bottom: 0.25rem;

    img.item-art {
      object-fit: contain;
      border: 2px solid #000;
    }
  }
</style>
