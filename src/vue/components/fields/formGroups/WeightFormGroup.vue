<template>
  <NumberFormGroup
    :value="weight"
    :label="props.label"
    :hint="props.hint"
    :min="props.min ?? 0"
    :max="props.max"
    :step="props.step"
    :disabled="props.disabled"
    :read-only="props.readOnly"
    :force-edit="props.forceEdit"
    :hideFieldControls="props.hideFieldControls"
    :default-editability="props.defaultEditability"
    :default-visibility="props.defaultVisibility"
    :on-update="weightUpdater"
    :field-path="props.fieldPath"
    :unit="weightDisplayShortLabel"
    class="weight-form-group"
  >
    <template v-if="slots.controls" #controls="{ editable }">
      <slot name="controls" :editable="editable" />
    </template>
    <template #readonly>
      <slot name="readonly">
        {{ weight }} {{ weightDisplayShortLabel }}
      </slot>
    </template>
  </NumberFormGroup>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { roundToDecimal } from '@helpers/math.mjs';
  import type { PhysicalDocumentStore } from '@items/physical/physicalItem/index.mjs';
  import type { SettingsStore } from '@settings/index.mjs';
  import { SettingsStoreSymbol } from '@settings/index.mjs';
  import { computed, inject, useSlots } from 'vue';

  import NumberFormGroup from './NumberFormGroup.vue';
  import type { ForcedUnitNumberFormGroupProps } from './types.mts';

  const slots = useSlots();

  const props = defineProps<ForcedUnitNumberFormGroupProps>();

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
    const value = props.value !== undefined
      ? props.value
      : getViewAwareFieldValue<number>(props.fieldPath);
    return roundToDecimal(convertToLocalizedWeight(value ?? 0), 2);
  });

  // Projection callback: convert localized display weight back to stored base units.
  const weightUpdater = (value: number | null) => {
    const realValue = convertToStoredWeight(value ?? 0);
    const updater = props.onUpdate
      ?? getViewAwareFieldUpdater(props.fieldPath);
    updater(realValue);
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
