<template>
  <SelectFormGroup
    v-if="hasOwner || currentContainerId"
    label="Container"
    :value="currentContainerId"
    :options="possibleContainers"
    field-path="system.containerId"
    :update-value="syncContainer"
  />
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { PhysicalDocumentStore } from '@items/physical/physicalItem/index.mjs';
  import SelectFormGroup from '@vc/fields/formGroups/SelectFormGroup.vue';
  import { inject } from 'vue';

  const {
    documentGetters: {
      possibleContainers,
      containerUuid: currentContainerId,
      hasOwner,
    },
    documentActions: { syncContainer },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;
</script>
