<template>
  <NumberFormGroup
    label="Weight"
    :value="weight"
    :on-update="weightUpdater"
    field-path="system.weight"
    :unit="weightDisplayShortLabel"
  >
    <template v-if="slots.controls" #controls>
      <slot name="controls" />
    </template>
    <template #readonly>
      {{ effectiveWeight }} {{ weightDisplayShortLabel }}
    </template>
    <!-- old implementation
    <input
      type="number"
      :value="weight"
      :disabled="!isEditable"
      @change="weightUpdater(($event.target as HTMLInputElement).value)"
    />
    <span>{{ weightDisplayShortLabel }}</span>
    -->
  </NumberFormGroup>
</template>
<script setup lang="ts">
  import { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { SettingsStore } from '@settings/core/sheet/index.mjs';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { inject, useSlots } from 'vue';

  const slots = useSlots();

  const {
    measurement: {
      weightDisplayShortLabel,
      convertToStoredWeight,
    },
  } = inject('settingsStore') as SettingsStore;

  const {
    physicalItemGetters: {
      actualWeight: weight,
      effectiveWeight,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const weightUpdater = (value: number | null) => {
    const realValue = convertToStoredWeight(value ?? 0);
    getViewAwareFieldUpdater('system.weight')(realValue);
  };
</script>
