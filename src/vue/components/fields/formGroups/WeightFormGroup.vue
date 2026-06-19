<template>
  <NumberFormGroup
    :value="weight"
    :on-update="weightUpdater"
    :field-path="props.fieldPath"
    :unit="weightDisplayShortLabel"
    class="weight-form-group"
  >
    <template v-if="slots.controls" #controls="{ editable }">
      <slot name="controls" :editable="editable" />
    </template>
    <template #readonly>
      {{ weight }} {{ weightDisplayShortLabel }}
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
    fieldPath: string;
  }>();

  const {
    measurement: {
      weightDisplayShortLabel,
      convertToStoredWeight,
      convertToLocalizedWeight,
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

  const weight = computed(() => {
    const value = getViewAwareFieldValue<number>(props.fieldPath);
    return convertToLocalizedWeight(value ?? 0) ?? 0;
  });

  // Projection callback: convert localized display weight back to stored base units.
  const weightUpdater = (value: number | null) => {
    const realValue = convertToStoredWeight(value ?? 0);
    getViewAwareFieldUpdater(props.fieldPath)(realValue);
  };
</script>

<style lang="scss" scoped>
.weight-form-group {
  :deep(.input-group .number-input) {
    padding-right: 4ch;
    width: 10.5ch;
  }
}
</style>
