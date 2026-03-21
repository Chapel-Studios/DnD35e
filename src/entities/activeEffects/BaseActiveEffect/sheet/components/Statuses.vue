<template>
  <MultiSelectFormGroup
    class="grid-full-row"
    label="EFFECT.Statuses"
    field-path="statuses"
    :value="statuses"
    :options="statusOptions"
    :on-update="getDirectFieldUpdater('statuses')"
  />
</template>

<script setup lang="ts">
  import { MultiSelectFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  import { ActiveEffectConfigStore } from '../ActiveEffectConfigStore.mjs';

  const {
    documentGetters: {
      statuses,
      statusOptions,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject('documentSheetStore') as ActiveEffectConfigStore;
</script>

<style lang="scss" scoped>
</style>
