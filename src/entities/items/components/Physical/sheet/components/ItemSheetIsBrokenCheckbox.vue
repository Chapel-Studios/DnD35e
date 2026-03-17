<template>
  <CheckBoxFormGroup
    label="D35E.IsBroken"
    :value="isBroken"
    :on-update="updater"
    field-path="system.isBroken"
    default-visibility="gmOnly"
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
      getDirectFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const updater = getDirectFieldUpdater('system.isBroken');
</script>
