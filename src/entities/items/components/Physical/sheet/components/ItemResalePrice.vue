<template>
  <FormGroup
    :editable="isEditable"
    label="D35E.ResalePrice"
    :value="resalePrice"
    @update="updater"
    type="number"
    is-dm-only
  />
</template>
<script setup lang="ts">
  import { FormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';
  import { PhysicalItemSheetStore } from '@items/components/Physical/index.mjs';

  const {
    isEditable,
    physicalItemGetters: {
      resalePrice,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('itemSheetStore') as PhysicalItemSheetStore;

  const updater = getFieldUpdater('system.resalePrice');
</script>
