<template>
  <EffectCategory
    v-if="materials.length"
    :label="localize('dnd35e.COMMON.Materials').value"
    :effects="materials"
    :can-edit="isEditViewMode"
  />
</template>

<script setup lang="ts">
  import type { RenderModeStore } from '@ec/CoreMixin/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { EffectCategory } from '@items/baseItem/index.mjs';
  import { inject } from 'vue';

  import type { PhysicalDocumentStore } from '../PhysicalItemStore.mjs';

  const { isEditViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: {
      materials,
    },
    _storeUtils: {
      createLocalizedComputed: localize,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;

</script>