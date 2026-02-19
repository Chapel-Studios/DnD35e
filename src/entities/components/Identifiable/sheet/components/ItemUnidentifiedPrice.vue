<template>
  <FormGroup
    :editable="isEditable"
    label="Unid. Price"
    :value="unidentifiedPrice"
    @update="updater"
  />
</template>
<script setup lang="ts">
  import { FormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';
  import { IdentifiableStore } from '../IdentifiableItemStore.mjs';

  const {
    isEditable,
    identifableGetters: {
      unidentifiedPrice,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('documentSheetStore') as IdentifiableStore;

  const updater = getFieldUpdater('system.unidentifiedInfo.unidentifiedPrice');
</script>
