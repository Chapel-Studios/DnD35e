<template>
  <FormGroup
    :editable="isEditable"
    label="Weight"
    :value="weight"
    @update="updater"
    type="number"
  />
</template>
<script setup lang="ts">
  import { FormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';
  import { PhysicalItemStore } from '@items/components/Physical/index.mjs';

  const {
    isEditable,
    physicalItemGetters: {
      weight,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalItemStore;

  const updater = getFieldUpdater('system.weight');
</script>
