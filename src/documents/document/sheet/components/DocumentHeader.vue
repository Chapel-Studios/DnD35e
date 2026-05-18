<template>
  <div class="item-header">
    <slot>
      <HeaderNameField />
    </slot>

    <div class="item-subtitle">
      <h4 class="item-type">{{localizedType}}</h4>
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
  .item-header {
    display: grid;
    grid-template: auto / 130px 3fr minmax(80px, auto);
    margin-bottom: 0.5rem;
  }

  .item-subtitle {
    flex: 0 0 80px;
    margin: 0;
    padding: 0.25rem 1rem 1rem;
    color: #7a7971;
  }

  .item-type {
    font-size: 24px;
    line-height: 26px;
    text-align: center;
    margin-bottom: 0.5rem;
  }
</style>
