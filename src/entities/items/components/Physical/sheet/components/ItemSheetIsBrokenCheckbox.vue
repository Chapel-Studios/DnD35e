<template>
  <!-- <CheckBoxFormGroup
    label="D35E.IsBroken"
    :value="isBroken"
    :on-update="updater"
    field-path="system.isBroken"
    default-visibility="gmOnly"
  /> -->
</template>
<script setup lang="ts">
  /* eslint-disable @typescript-eslint/no-unused-vars */
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { CheckBoxFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: {
      // isBroken,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;

  const updater = getDirectFieldUpdater('system.isBroken');
</script>
