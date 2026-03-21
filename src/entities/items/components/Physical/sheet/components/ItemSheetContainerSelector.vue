<template>
  <SelectFormGroup
    v-if="hasOwner"
    label="Container"
    :value="currentContainerId"
    :on-update="updater"
    :options="possibleContainers"
    field-path="system.containerId"
  />
</template>
<script setup lang="ts">
  import { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { SelectFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: {
      possibleContainers,
      currentContainerId,
    },
    documentGetters: {
      hasOwner,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const updater = getDirectFieldUpdater('system.containerId');
</script>
