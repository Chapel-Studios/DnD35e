<template>
  <SelectFormGroup
    label="EFFECT.ShowIcon"
    field-path="showIcon"
    :value="showIcon"
    :options="showIconOptions"
    :on-update="getViewAwareFieldUpdater('showIcon')"
  />
</template>

<script setup lang="ts">
  import { SelectFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  import { ActiveEffectConfigStore } from '../ActiveEffectConfigStore.mjs';

  const {
    documentGetters: {
      showIcon,
      showIconOptions,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject('documentSheetStore') as ActiveEffectConfigStore;
</script>

<style lang="scss" scoped>
</style>
