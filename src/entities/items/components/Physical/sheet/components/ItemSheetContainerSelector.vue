<template>
  <FormGroup
    :editable="isEditable"
    label="Price"
    :value="currentContainerId"
    @update="updater"
    type="select"
    :options="possibleContainers"
  />
</template>
<script setup lang="ts">
  import { FormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';
  import { PhysicalItemSheetStore } from '@items/components/Physical/index.mjs';

  const {
    isEditable,
    physicalItemGetters: {
      possibleContainers,
      currentContainerId,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('itemSheetStore') as PhysicalItemSheetStore;

  const updater = getFieldUpdater('system.containerId');
</script> 