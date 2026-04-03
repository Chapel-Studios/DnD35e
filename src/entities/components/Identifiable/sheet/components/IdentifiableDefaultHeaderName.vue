<template>
  <div class="identifiable-header-main">
    <!-- <HeaderNameField :value="effectiveDisplayName" /> -->
  </div>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol, HeaderNameField } from '@ec/CoreMixin/index.mjs';
  import type { IdentifiableDocumentStore } from '@ec/Identifiable/index.mjs';
  import { inject } from 'vue';

  const store = inject(DocumentSheetStoreSymbol) as IdentifiableDocumentStore;

  // const {
  //   documentGetters: {
  //     displayName,
  //     identifiedDisplayName,
  //     unidentifiedDisplayName,
  //     isViewingAsUnidentified,
  //   },
  //   unidentifiedVisibilityMode: {
  //     showBoth,
  //   },
  // } = store;

  // const effectiveDisplayName = computed(() => {
  //   if (isViewingAsUnidentified.value) {
  //     return unidentifiedDisplayName.value || '???';
  //   }
  //   if (showBoth.value) {
  //     return identifiedDisplayName.value || displayName.value;
  //   }
  //   return displayName.value;
  // });
</script>

<style scoped lang="scss">
  .identifiable-header-main {
    display: contents;
  }
</style>
