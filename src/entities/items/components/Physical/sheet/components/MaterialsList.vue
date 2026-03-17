<template>
  <EffectCategory
    v-if="materials.length"
    :label="localize('D35E.Materials').value"
    :effects="materials"
    :can-edit="isEditable"
  />
</template>

<script setup lang="ts">
  import { EffectCategory } from '@items/baseItem/index.mjs';
  import { inject } from 'vue';

  import { PhysicalDocumentStore } from '../PhysicalItemStore.mjs';

  const {
    physicalItemGetters: {
      materials,
    },
    localize,
    isEditable,
  } = inject('documentSheetStore') as PhysicalDocumentStore;

</script>