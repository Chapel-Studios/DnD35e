<template>
  <NumberFormGroup
    :editable="isEditable"
    label="Hardness"
    :value="effectiveHardness"
    :on-update="hardnessUpdater"
    field-path="system.hardness"
  />
</template>
<script setup lang="ts">
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { computed, inject } from 'vue';

  const {
    isEditable,
    physicalItemGetters: {
      hardness,
    },
    documentGetters: {
      getEffectiveFieldValue,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const effectiveHardness = computed(() =>
    getEffectiveFieldValue('system.hardness', hardness.value)
  );
  const hardnessUpdater = getViewAwareFieldUpdater('system.hardness');
</script>
