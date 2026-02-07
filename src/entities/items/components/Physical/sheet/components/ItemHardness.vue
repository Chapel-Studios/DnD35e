<template>
  <FormGroup
    :editable="isEditable"
    label="Hardness"
    :value="hardness"
    @update="updateCurrentHp"
    type="number"
  />
</template>
<script setup lang="ts">
  import { FormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';
  import { PhysicalItemSheetStore } from '@items/components/Physical/index.mjs';

  const {
    isEditable,
    physicalItemGetters: {
      hardness,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('itemSheetStore') as PhysicalItemSheetStore;

  const updateCurrentHp = getFieldUpdater('system.hardness');
</script>
