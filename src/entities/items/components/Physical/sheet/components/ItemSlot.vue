<template>
  <!-- <MultiSelectFormGroup
    label="Container"
    :value="currentContainerId"
    :on-update="updater"
    :options="EQUIP_SLOT_SELECT_OPTIONS"
    field-path="system.containerId"
  /> -->
</template>
<script setup lang="ts">
  /* eslint-disable @typescript-eslint/no-unused-vars */
  import { EQUIP_SLOT_SELECT_OPTIONS } from '@constants/equipmentSlots.mjs';
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { MultiSelectFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    // isEditable,
    // documentGetters: {
    //   slotIds,
    // },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;

  const updater = getViewAwareFieldUpdater('system.containerId');
</script>
