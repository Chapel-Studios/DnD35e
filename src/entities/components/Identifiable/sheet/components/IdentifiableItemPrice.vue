<template>
  <FormGroup
    :editable="isEditable"
    label="Unid. Price"
    :value="unidentifiedPrice"
    @update="updater"
  />
</template>
<script setup lang="ts">
  import { IdentifiableDocumentStore } from '@ec/Identifiable/index.mjs';
  import { FormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    isEditable,
    identifableGetters: {
      unidentifiedPrice,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('documentSheetStore') as IdentifiableDocumentStore;

  const updater = getFieldUpdater('system.unidentifiedInfo.unidentifiedPrice');
</script>
