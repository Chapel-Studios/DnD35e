<template>
  <NumberFormGroup
    :editable="isEditable"
    label="D35E.ResalePrice"
    :value="resalePrice"
    :on-update="updater"
    is-dm-only
  />
</template>
<script setup lang="ts">
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    isEditable,
    physicalItemGetters: {
      resalePrice,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const updater = getFieldUpdater('system.resalePrice');
</script>
