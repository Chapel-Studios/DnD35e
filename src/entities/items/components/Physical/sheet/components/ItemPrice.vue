<template>
  <NumberFormGroup
    v-if="showIdentified"
    :editable="isEditable"
    label="Price"
    :value="activeValue"
    :on-update="activeUpdater"
  />
</template>
<script setup lang="ts">
  import { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { computed, inject } from 'vue';

  const documentSheetStore = inject('documentSheetStore') as PhysicalDocumentStore;
  
  const {
    isEditable,
    physicalItemGetters: {
      price,
    },
    documentActions: {
      getFieldUpdater,
    },
    identifiableGetters: { unidentifiedPrice },
    unidentifiedInfoMode: { showIdentified },
  } = documentSheetStore as PhysicalDocumentStore;

  const activeValue = computed(() => showIdentified
    ? price.value
    : unidentifiedPrice.value
  );
  const activeUpdater = computed(() => showIdentified
    ? getFieldUpdater('system.price')
    : getFieldUpdater('system.unidentifiedInfo.unidentifiedPrice')
  );
</script>
