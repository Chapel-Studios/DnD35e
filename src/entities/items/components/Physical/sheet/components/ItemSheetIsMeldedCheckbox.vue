<template>
  <FormGroup
    :editable="isEditable"
    label="Is Carried"
    :value="isCarried"
    @update="updater"
    type="checkbox"
  />
</template>
<script setup lang="ts">
  import { FormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';
  import { PhysicalItemSheetStore } from '@items/components/Physical/index.mjs';

  const {
    isEditable,
    physicalItemGetters: {
      isCarried,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('itemSheetStore') as PhysicalItemSheetStore;

  const updater = getFieldUpdater('system.isCarried');
</script> 