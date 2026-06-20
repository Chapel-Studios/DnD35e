<template>
  <NumberFormGroup
    :value="distance"
    :on-update="distanceUpdater"
    :field-path="props.fieldPath"
    :unit="distanceDisplayShortLabel"
    :label="props.label"
    :hint="props.hint"
    :min="props.min ?? 0"
    :max="props.max"
    :step="props.step"
    :disabled="props.disabled"
    :read-only="props.readOnly"
    :force-edit="props.forceEdit"
    :show-field-controls="props.showFieldControls"
    :default-editability="props.defaultEditability"
    :default-visibility="props.defaultVisibility"
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
  import type { ForcedUnitNumberFormGroupProps } from './types.mjs';

  const slots = useSlots();

  const props = defineProps<ForcedUnitNumberFormGroupProps>();

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
    const value = props.value
      ?? getViewAwareFieldValue<number>(props.fieldPath);
    return Math.roundDecimals(convertToLocalizedDistance(value), 2);
  });

  // Projection callback: convert localized display units back to stored distance units.
  const distanceUpdater = (value: number | null) => {
    const realValue = convertToStoredDistance(value ?? 0);
    const updater = props.onUpdate ?? getViewAwareFieldUpdater(props.fieldPath);
    updater(realValue);
  };
</script>

<style lang="scss" scoped>
</style>
