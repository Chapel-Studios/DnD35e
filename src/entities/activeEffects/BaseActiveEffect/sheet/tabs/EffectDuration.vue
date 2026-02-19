<template>
  <section
    class="effect-duration"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="duration"
  >
    <div class="form-group">
      <label>{{ durationLabel }}</label>
      <div class="form-fields">
        <input
          type="number"
          name="duration.value"
          :value="durationValue"
          :disabled="!isEditable"
          min="0"
        />
        <select name="duration.units" :value="durationUnits" :disabled="!isEditable">
          <option v-for="unit in availableUnits" :key="unit.value" :value="unit.value">
            {{ unit.label }}
          </option>
        </select>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import type { ActiveEffectConfigStore } from '@effects/BaseActiveEffect/index.mjs';
  import { computed, inject } from 'vue';

  const store = inject('documentSheetStore') as ActiveEffectConfigStore;
  const {
    tabs: {
      tabGetters: { getIsTabOpen },
    },
    documentGetters: {
      durationValue,
      durationUnits,
    },
    isEditable,
  } = store;

  const isActiveTab = getIsTabOpen('duration');

  const durationLabel = game.i18n.localize('EFFECT.Duration');

  const availableUnits = computed(() => {
    return CONST.ACTIVE_EFFECT_DURATION_UNITS.map((value) => ({
      value,
      label: game.i18n.localize(`EFFECT.DURATION.UNITS.${value}`),
    }));
  });
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
