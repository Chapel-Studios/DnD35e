<template>
  <!-- <NumberFormGroup
    :editable="isEditable"
    label="D35E.BrokenResalePrice"
    :value="effectiveBrokenResalePrice"
    :on-update="updater"
    field-path="system.brokenResalePrice"
    default-visibility="gmOnly"
  /> -->
</template>
<script setup lang="ts">
  /* eslint-disable @typescript-eslint/no-unused-vars */
  import { DocumentSheetStoreSymbol, RenderModeStore, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { computed, inject } from 'vue';

  // const {
  //   isEditable,
  //   documentGetters: {
  //     brokenResalePrice,
  //   },
  //   documentGetters: {
  //     getViewAwareFieldValue,
  //   },
  //   documentActions: {
  //     getViewAwareFieldUpdater,
  //   },
  // } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;
  const {
    documentGetters: {
      getViewAwareFieldValue,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;
  const { isEditViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;

  const effectiveBrokenResalePrice = computed(() =>
    getViewAwareFieldValue('system.brokenResalePrice')
  );
  const updater = getViewAwareFieldUpdater('system.brokenResalePrice');
</script>
