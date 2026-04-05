<template>
  <section
    class="effect-duration"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="duration"
  >
    <NumberFormGroup
      :label="durationLabel"
      field-path="duration.value"
      :value="durationValue"
      :on-update="updateDurationValue"
      edit-derived
    />
    <SelectFormGroup
      :label="durationUnitsLabel"
      field-path="duration.units"
      :value="durationUnits"
      :options="availableUnits"
      :on-update="updateDurationUnits"
      edit-derived
    />
  </section>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol, TabStore, TabStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { ActiveEffectConfigStore } from '@effects/BaseActiveEffect/index.mjs';
  import { NumberFormGroup, SelectFormGroup } from '@vc/Fields/index.mjs';
  import { computed, inject } from 'vue';

  const { getIsTabOpen } = inject(TabStoreSymbol) as TabStore;
  const {
    documentGetters: { durationValue, durationUnits, },
    documentActions: { updateDurationValue, updateDurationUnits },
    _storeUtils: { createLocalizedComputed },
  } = inject(DocumentSheetStoreSymbol) as ActiveEffectConfigStore;

  const isActiveTab = getIsTabOpen('duration');

  const durationLabel = createLocalizedComputed('EFFECT.Duration');
  const durationUnitsLabel = createLocalizedComputed('EFFECT.DURATION.Units');

  const availableUnits = computed(() =>
    CONST.ACTIVE_EFFECT_DURATION_UNITS.map((value) => ({
      value,
      label: game.i18n.localize(`EFFECT.DURATION.UNITS.${value}`),
    }))
  );
</script>

<style scoped>
  .effect-duration {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .form-group label {
    font-weight: bold;
  }

  .form-fields {
    display: flex;
    gap: 0.5rem;
  }

  .form-fields input[type="number"] {
    width: 80px;
  }

  .form-fields select {
    flex: 1;
  }
</style>
