<template>
  <NumberFormGroup
    :editable="isEditable"
    label="Quantity"
    :value="quantity"
    :on-update="updater"
  />
</template>
<script setup lang="ts">
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    isEditable,
    physicalItemGetters: {
      quantity,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const updater = getFieldUpdater('system.quantity');
</script>
