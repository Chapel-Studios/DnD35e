<template>
  <SelectFormGroup
    :editable="isEditViewMode"
    label="Size"
    :value="size"
    :on-update="updater"
    :options="EQUIP_SLOT_SELECT_OPTIONS"
    field-path="system.size"
  />
</template>
<script setup lang="ts">
  import { EQUIP_SLOT_SELECT_OPTIONS } from '@constants/equipmentSlots.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStore, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { SelectFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const { isEditViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: {
      size,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;
  const updater = getViewAwareFieldUpdater('system.size');
</script>
