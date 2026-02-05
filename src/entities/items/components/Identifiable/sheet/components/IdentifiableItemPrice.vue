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
import { IdentifiableItemStore } from '../IdentifiableItemStore.mjs';

  const {
    isEditable,
    identifableGetters: {
      unidentifiedPrice,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('itemSheetStore') as IdentifiableItemStore;

  const updater = getFieldUpdater('system.unidentifiedInfo.unidentifiedPrice');
</script> 