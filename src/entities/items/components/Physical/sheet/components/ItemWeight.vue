<template>
  <NumberFormGroup
    label="Weight"
    :value="weight"
    :on-update="updater"
  />
</template>
<script setup lang="ts">
  import { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    physicalItemGetters: {
      weight,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const updater = getFieldUpdater('system.weight');
</script>
