<template>
  <CheckBoxFormGroup
    :editable="isEditable"
    label="Is Carried"
    :value="isCarried"
    :on-update="updater"
  />
</template>
<script setup lang="ts">
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { CheckBoxFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    isEditable,
    physicalItemGetters: {
      isCarried,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const updater = getFieldUpdater('system.isCarried');
</script>
