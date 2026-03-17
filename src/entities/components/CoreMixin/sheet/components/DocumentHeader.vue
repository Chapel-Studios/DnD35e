<template>
  <div class="item-header">
    <slot>
      <DefaultHeaderName />
    </slot>

    <div class="item-subtitle">
      <h4 class="item-type">{{localizedType}}</h4>
      <slot name="status"></slot>
    </div>
    <slot name="summary"></slot>
  </div>
</template>

<script lang="ts" setup>
  import type { DocumentSheetStore } from '@ec/CoreMixin/sheet/useDocumentSheetStore.mjs';
  import { inject } from 'vue';

  import DefaultHeaderName from './DefaultHeaderName.vue';

  const { documentGetters: { localizedType } } = inject('documentSheetStore') as DocumentSheetStore;

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
