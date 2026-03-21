<script setup lang="ts">
  import { Effects } from '@items/baseItem/index.mjs';
  import { inject } from 'vue';

  import MaterialsList from '../components/MaterialsList.vue';
  import { PhysicalDocumentStore } from '../PhysicalItemStore.mjs';

  const {
    documentGetters: {
      materials,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

</script>

<template>
  <Effects :has-added-effects="!!materials.length">
    <template #effects-list-prepend>
      <MaterialsList />
    </template>
  </Effects>
</template>
