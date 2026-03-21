<template>
  <CheckBoxFormGroup
    :editable="isEditable"
    label="Is Carried"
    :value="isCarried"
    :on-update="updater"
    field-path="system.isCarried"
  />
</template>
<script setup lang="ts">
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { CheckBoxFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    isEditable,
    documentGetters: {
      isCarried,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const updater = getDirectFieldUpdater('system.isCarried');
</script>
