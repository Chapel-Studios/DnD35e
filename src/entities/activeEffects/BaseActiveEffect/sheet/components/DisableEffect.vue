<template>
  <ToggleSwitchFormGroup
    class="effect-enablement"
    :value="isDisabled"
    :on-update="getDirectFieldUpdater('disabled')"
    field-path="disabled"
    true-label="EFFECT.Disabled"
    false-label="EFFECT.Enabled"
    flip
  />
</template>

<script setup lang="ts">
  import { ToggleSwitchFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  import { ActiveEffectConfigStore } from '../ActiveEffectConfigStore.mjs';

  const {
    documentGetters: {
      isDisabled,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject('documentSheetStore') as ActiveEffectConfigStore;
</script>

<style lang="scss" scoped>
  .effect-enablement {
    grid-column: span 2;
    display: grid;
    direction: rtl; // Flip the switch to the right side of the sheet
    grid-template-columns: 1fr min-content;
    justify-self: center;

    :deep(.controls),
    :deep(.form-fields) {
      direction: ltr; // Flip the switch back to normal
    }
  }
</style>
