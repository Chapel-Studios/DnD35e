<template>
  <FormGroup
    v-if="shouldShowPrice"
    :editable="isEditable"
    label="Price"
    :value="price"
    @update="updater"
    type="number"
  />
</template>
<script setup lang="ts">
  import { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { FormGroup } from '@vc/Fields/index.mjs';
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
  } = documentSheetStore as PhysicalDocumentStore;

  // Check if this is an identifiable sheet and if so, only show when viewing identified
  const shouldShowPrice = computed(() => {
    const identifiableStore = documentSheetStore as unknown as { unidentifiedInfoMode?: Record<string, unknown> };
    if (identifiableStore.unidentifiedInfoMode) {
      const { showIdentified } = identifiableStore.unidentifiedInfoMode as { showIdentified: boolean | { value: boolean } };
      return typeof showIdentified === 'boolean' ? showIdentified : showIdentified.value;
    }
    return true; // Default to showing if not an identifiable sheet
  });

  const updater = getFieldUpdater('system.price');
</script>
