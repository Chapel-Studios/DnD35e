<template>
  <FormGroup
    v-if="showUnidentified"
    label="Unid. Price"
    :value="unidentifiedPrice"
    :onUpdate="updater"
  />
</template>
<script setup lang="ts">
  import { IdentifiableDocumentStore } from '@ec/Identifiable/index.mjs';
  import { FormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    identifiableGetters: {
      unidentifiedPrice,
    },
    documentActions: {
      getFieldUpdater,
    },
    unidentifiedInfoMode: {
      showUnidentified,
    },
  } = inject('documentSheetStore') as IdentifiableDocumentStore;

  const updater = getFieldUpdater('system.unidentifiedInfo.unidentifiedPrice');
</script>
