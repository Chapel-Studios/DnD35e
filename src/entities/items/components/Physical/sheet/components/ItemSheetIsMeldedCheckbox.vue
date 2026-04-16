<template>
  <CheckBoxFormGroup
    :editable="isEditViewMode"
    label="Is Carried"
    :value="isCarried"
    :on-update="updater"
    field-path="system.isCarried"
  />
</template>
<script setup lang="ts">
  import type { RenderModeStore } from '@ec/CoreMixin/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { CheckBoxFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const { isEditViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: {
      isCarried,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;

  const updater = getDirectFieldUpdater('system.isCarried');
</script>
