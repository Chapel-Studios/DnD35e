<template>
  <CheckBoxFormGroup
    v-if="hasOwner"
    label="Is Carried"
    :value="isCarried"
    :on-update="updater"
    field-path="system.isCarried"
    disabled
  />
</template>
<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { CheckBoxFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: {
      isCarried,
      hasOwner,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;

  const updater = getDirectFieldUpdater('system.isCarried');
</script>
