<template>
  <SelectFormGroup
    :editable="isEditable"
    label="Size"
    :value="effectiveSize"
    :on-update="updater"
    :options="EQUIP_SLOT_SELECT_OPTIONS"
    field-path="system.size"
  />
</template>
<script setup lang="ts">
  import { EQUIP_SLOT_SELECT_OPTIONS } from '@constants/equipmentSlots.mjs';
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { SelectFormGroup } from '@vc/Fields/index.mjs';
  import { computed, inject } from 'vue';

  const {
    isEditable,
    documentGetters: {
      size,
    },
    documentGetters: {
      getEffectiveFieldValue,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const effectiveSize = computed(() =>
    getEffectiveFieldValue('system.size', size.value)
  );
  const updater = getViewAwareFieldUpdater('system.size');
</script>
