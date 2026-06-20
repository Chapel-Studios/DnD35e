<template>
  <ToggleSwitchFormGroup
    class="effect-enablement"
    field-path="disabled"
    true-label="dnd35e.EFFECT.Disabled"
    false-label="dnd35e.EFFECT.Enabled"
    flip
  />
</template>

<script setup lang="ts">
  import { ToggleSwitchFormGroup } from '@vc/fields/index.mjs';
</script>

<style lang="scss" scoped>
  .effect-enablement {
    grid-column: span 2;
    display: grid;
    direction: rtl; // Flip the switch to the right side of the sheet
    grid-template-columns: 1fr min-content;
    justify-self: center;
    border: none;

    :deep(.controls),
    :deep(.form-fields) {
      direction: ltr; // Flip the switch back to normal
    }
  }
</style>
