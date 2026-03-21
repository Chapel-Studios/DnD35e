<template>
  <CheckBoxFormGroup
    v-if="hasOwner"
    label="Is Carried"
    :value="isCarried"
    :on-update="updater"
    field-path="system.isCarried"
  />
</template>
<script setup lang="ts">
  import { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { CheckBoxFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: {
      isCarried,
    },
    documentGetters: {
      hasOwner,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const updater = getDirectFieldUpdater('system.isCarried');
</script>
