<template>
  <CheckBoxFormGroup
    label="D35E.IsBroken"
    :value="isBroken"
    :on-update="updater"
    is-dm-only
  />
</template>
<script setup lang="ts">
  import { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { CheckBoxFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    physicalItemGetters: {
      isBroken,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const updater = getFieldUpdater('system.isBroken');
</script>
