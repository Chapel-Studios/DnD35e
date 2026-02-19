<template>
  <FormGroup
    :editable="isEditable"
    label="Price"
    :value="currentContainerId"
    @update="updater"
    type="multiselect"
    :options="EQUIP_SLOT_SELECT_OPTIONS"
  />
</template>
<script setup lang="ts">
  import { FormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';
  import { PhysicalItemStore } from '@items/components/Physical/index.mjs';
  import { EQUIP_SLOT_SELECT_OPTIONS } from '@constants/equipmentSlots.mjs';

  const {
    isEditable,
    physicalItemGetters: {
      currentContainerId,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalItemStore;

  const updater = getFieldUpdater('system.containerId');
</script>
