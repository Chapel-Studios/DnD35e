<template>
  <CheckBoxFormGroup
    :editable="isEditViewMode"
    label="Is Weightless When Equipped"
    :value="isWeightlessWhenEquipped"
    :on-update="updater"
    field-path="system.isWeightlessWhenEquipped"
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
      isWeightlessWhenEquipped,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as EquippableDocumentStore;

  const updater = getDirectFieldUpdater('system.isWeightlessWhenEquipped');
</script>
