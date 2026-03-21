<template>
  <NumberFormGroup
    :editable="isEditable"
    label="D35E.ResalePrice"
    :value="effectiveResalePrice"
    :on-update="updater"
    field-path="system.resalePrice"
    default-visibility="gmOnly"
  />
</template>
<script setup lang="ts">
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { computed, inject } from 'vue';

  const {
    isEditable,
    documentGetters: {
      resalePrice,
    },
    documentGetters: {
      getEffectiveFieldValue,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const effectiveResalePrice = computed(() =>
    getEffectiveFieldValue('system.resalePrice', resalePrice.value)
  );
  const updater = getViewAwareFieldUpdater('system.resalePrice');
</script>
