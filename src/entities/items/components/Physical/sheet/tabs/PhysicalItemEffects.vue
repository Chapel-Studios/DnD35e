<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { Effects } from '@items/baseItem/index.mjs';
  import { inject } from 'vue';

  import MaterialsList from '../components/MaterialsList.vue';
  import SecretsList from '../components/SecretsList.vue';
  import type { PhysicalDocumentStore } from '../PhysicalItemStore.mjs';

  const {
    documentGetters: {
      materials,
      secrets,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;

</script>

<template>
  <Effects :has-added-effects="!!materials.length || !!secrets.length">
    <template #effects-list-prepend>
      <SecretsList />
      <MaterialsList />
    </template>
  </Effects>
</template>
