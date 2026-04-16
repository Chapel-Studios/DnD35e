<template>
  <CheckBoxFormGroup
    :editable="isEditViewMode"
    label="Is Melded"
    :value="isMelded"
    :on-update="updater"
    field-path="system.isMelded"
  />
</template>
<script setup lang="ts">
  import type { RenderModeStore } from '@ec/CoreMixin/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { EquippableDocumentStore } from '@items/components/Equippable/index.mjs';
  import { CheckBoxFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const { isEditViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: {
      isMelded,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as EquippableDocumentStore;

  const updater = getDirectFieldUpdater('system.isMelded');
</script>
