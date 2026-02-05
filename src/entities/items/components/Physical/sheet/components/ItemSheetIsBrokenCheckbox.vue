<template>
  <FormGroup
    :editable="isEditable"
    label="D35E.IsBroken"
    :value="isBroken"
    @update="updater"
    type="checkbox"
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
      isBroken,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('itemSheetStore') as PhysicalItemSheetStore;

  const updater = getFieldUpdater('system.isBroken');
</script>
