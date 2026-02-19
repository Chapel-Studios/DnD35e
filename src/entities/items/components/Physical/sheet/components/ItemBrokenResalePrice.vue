<template>
  <FormGroup
    :editable="isEditable"
    label="D35E.BrokenResalePrice"
    :value="brokenResalePrice"
    @update="updater"
    type="number"
    is-dm-only
  />
</template>
<script setup lang="ts">
  import { FormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';
  import { PhysicalItemStore } from '@items/components/Physical/index.mjs';

  const {
    isEditable,
    physicalItemGetters: {
      brokenResalePrice,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalItemStore;

  const updater = getFieldUpdater('system.brokenResalePrice');
</script>
