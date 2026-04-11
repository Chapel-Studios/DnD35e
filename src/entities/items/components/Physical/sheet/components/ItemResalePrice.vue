<template>
  <!-- <NumberFormGroup
    :editable="isEditViewMode"
    label="dnd35e.PHYSICAL_ITEM.ResalePrice"
    :value="resalePrice"
    :on-update="updater"
    field-path="system.resalePrice"
    default-visibility="gmOnly"
  /> -->
</template>
<script setup lang="ts">
  /* eslint-disable @typescript-eslint/no-unused-vars */
  import { DocumentSheetStoreSymbol, RenderModeStore, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { inject } from 'vue';

  const { isEditViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: {
      // resalePrice,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;
  const updater = getViewAwareFieldUpdater('system.resalePrice');
</script>
