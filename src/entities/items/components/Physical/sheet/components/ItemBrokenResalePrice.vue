<template>
  <NumberFormGroup
    :editable="isEditable"
    label="D35E.BrokenResalePrice"
    :value="effectiveBrokenResalePrice"
    :on-update="updater"
    field-path="system.brokenResalePrice"
    default-visibility="gmOnly"
  />
</template>
<script setup lang="ts">
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { computed, inject } from 'vue';

  const {
    isEditable,
    physicalItemGetters: {
      brokenResalePrice,
    },
    documentGetters: {
      getEffectiveFieldValue,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const effectiveBrokenResalePrice = computed(() =>
    getEffectiveFieldValue('system.brokenResalePrice', brokenResalePrice.value)
  );
  const updater = getViewAwareFieldUpdater('system.brokenResalePrice');
</script>
