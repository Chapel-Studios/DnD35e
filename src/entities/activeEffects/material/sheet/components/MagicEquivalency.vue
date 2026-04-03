<template>
  <NumberFormGroup
    label="D35E.MagicEquivalent"
    :value="magicEquivalency"
    field-path="system.magicEquivalency"
    direct-update
    :read-only="props.readOnly"
  />
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { MaterialStore } from '@effects/material/index.mjs';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const props = defineProps<{
    /** When true, forces the readonly display. */
    readOnly?: boolean;
  }>();

  const {
    documentGetters: {
      magicEquivalency,
    },
  } = inject(DocumentSheetStoreSymbol) as MaterialStore;
</script>

<style lang="scss" scoped>
</style>
