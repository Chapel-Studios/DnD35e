<template>
  <div class="item-art-container">
    <ImageField field="img" :title="displayName" class="item-art" />
  </div>
</template>

<script lang="ts" setup>
  import type { DocumentSheetStore } from '@ec/CoreMixin/sheet/useDocumentSheetStore.mjs';
  import ImageField from '@vc/Fields/ImageField.vue';
  import { inject } from 'vue';

  const {
    documentGetters: {
      displayName,
    },
  } = inject('documentSheetStore') as DocumentSheetStore;
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
