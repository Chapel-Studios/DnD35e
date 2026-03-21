<template>
  <MultiSelectFormGroup
    class="grid-full-row"
    label="DND35E.Settings.DamageReductionTypes.Label"
    field-path="system.damageReductionTypes"
    :value="damageReductionTypes"
    :options="damageReductionTypeOptions"
    :on-update="getDirectFieldUpdater('system.damageReductionTypes')"
  />
</template>

<script setup lang="ts">
  import type { MaterialStore } from '@effects/material/index.mjs';
  import { MultiSelectFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: {
      damageReductionTypes,
      damageReductionTypeOptions,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject('documentSheetStore') as MaterialStore;
</script>

<style lang="scss" scoped>
</style>
