<template>
  <SelectFormGroup
    label="Price"
    :value="currentContainerId"
    :on-update="updater"
    :options="possibleContainers"
  />
</template>
<script setup lang="ts">
  import { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { SelectFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    physicalItemGetters: {
      possibleContainers,
      currentContainerId,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const updater = getFieldUpdater('system.containerId');
</script>
