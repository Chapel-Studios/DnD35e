<template>
  <ToggleSwitchFormGroup
    class="effect-enablement"
    :value="isDisabled"
    :on-update="getDirectFieldUpdater('disabled')"
    field-path="disabled"
    true-label="dnd35e.EFFECT.Disabled"
    false-label="dnd35e.EFFECT.Enabled"
    flip
  />
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { ToggleSwitchFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  import type { ActiveEffectConfigStore } from '../ActiveEffectConfigStore.mjs';

  const {
    documentGetters: {
      isDisabled,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as ActiveEffectConfigStore;
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
