<template>
  <NumberFormGroup
    :value="weight"
    :on-update="weightUpdater"
    field-path="system.weight"
    :unit="weightDisplayShortLabel"
  >
    <template v-if="slots.controls" #controls="{ editable }">
      <slot name="controls" :editable="editable" />
    </template>
    <template #readonly>
      {{ effectiveWeight }} {{ weightDisplayShortLabel }}
    </template>
  </NumberFormGroup>
</template>
<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import type { SettingsStore } from '@settings/core/sheet/index.mjs';
  import { SettingsStoreSymbol } from '@settings/core/sheet/index.mjs';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { inject, useSlots } from 'vue';

  const slots = useSlots();

  const {
    measurement: {
      weightDisplayShortLabel,
      convertToStoredWeight,
    },
  } = inject(SettingsStoreSymbol) as SettingsStore;

  const {
    documentGetters: {
      actualWeight: weight,
      effectiveWeight,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;

  const weightUpdater = (value: number | null) => {
    const realValue = convertToStoredWeight(value ?? 0);
    getViewAwareFieldUpdater('system.weight')(realValue);
  };
</script>
