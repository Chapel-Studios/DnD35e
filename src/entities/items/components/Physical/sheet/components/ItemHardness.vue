<template>
  <NumberFormGroup
    :editable="isEditable"
    label="Hardness"
    :value="hardness"
    :on-update="updateCurrentHp"
  />
</template>
<script setup lang="ts">
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    isEditable,
    physicalItemGetters: {
      hardness,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const updateCurrentHp = getFieldUpdater('system.hardness');
</script>
