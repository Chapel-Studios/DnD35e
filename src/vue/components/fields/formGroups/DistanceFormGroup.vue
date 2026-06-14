<template>
  <NumberFormGroup
    :value="distance"
    :on-update="distanceUpdater"
    :field-path="props.fieldPath"
    :unit="distanceDisplayShortLabel"
    :label="props.label"
    :hint="props.hint"
  >
    <template v-if="slots.controls" #controls="{ editable }">
      <slot name="controls" :editable="editable" />
    </template>
    <template #readonly>
      <slot name="readonly">
        {{ distance }} {{ distanceDisplayShortLabel }}
      </slot>
    </template>
  </NumberFormGroup>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { PhysicalDocumentStore } from '@items/physical/physicalItem/index.mjs';
  import type { SettingsStore } from '@settings/index.mjs';
  import { SettingsStoreSymbol } from '@settings/index.mjs';
  import { computed, inject, useSlots } from 'vue';

  import NumberFormGroup from './NumberFormGroup.vue';

  const slots = useSlots();

  const props = defineProps<{
    /** When true, edit inputs show derived data instead of source data. */
    editDerived?: boolean;
    fieldPath: string;
    label?: string;
    hint?: string;
  }>();

  const {
    measurement: {
      distanceDisplayShortLabel,
      convertToStoredDistance,
      convertToLocalizedDistance,
    },
  } = inject(SettingsStoreSymbol) as SettingsStore;

  const {
    documentGetters: {
      getViewAwareFieldValue,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;

  const distance = computed(() => {
    const value = getViewAwareFieldValue<number>(props.fieldPath);
    return convertToLocalizedDistance(value ?? 0) ?? 0;
  });

  const distanceUpdater = (value: number | null) => {
    const realValue = convertToStoredDistance(value ?? 0);
    getViewAwareFieldUpdater(props.fieldPath)(realValue);
  };
</script>

<style lang="scss" scoped>
</style>
