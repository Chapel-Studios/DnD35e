<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { ItemEffects } from '@items/baseItem/index.mjs';
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
  <ItemEffects :has-added-effects="!!materials.length || !!secrets.length">
    <template #effects-list-prepend>
      <SecretsList />
      <MaterialsList />
    </template>
  </ItemEffects>
</template>
