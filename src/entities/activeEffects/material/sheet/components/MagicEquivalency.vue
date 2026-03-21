<template>
  <NumberFormGroup
    label="D35E.MagicEquivalent"
    :value="magicEquivalency"
    field-path="system.magicEquivalency"
    direct-update
  />
</template>

<script setup lang="ts">
  import type { MaterialStore } from '@effects/material/index.mjs';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: {
      magicEquivalency,
    },
  } = inject('documentSheetStore') as MaterialStore;
</script>

<style lang="scss" scoped>
</style>
