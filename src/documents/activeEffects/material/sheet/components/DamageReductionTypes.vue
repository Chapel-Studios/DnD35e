<template>
  <MultiSelectFormGroup
    class="grid-full-row"
    label="dnd35e.SETTINGS.DamageReductionTypes.Label"
    field-path="system.damageReductionTypes"
    :options="damageReductionTypeOptions"
    :read-only="props.readOnly"
  />
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { MaterialStore } from '@effects/material/index.mjs';
  import { MultiSelectFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  const props = defineProps<{
    /** When true, forces the readonly display. */
    readOnly?: boolean;
  }>();

  const {
    documentGetters: {
      damageReductionTypeOptions,
    },
  } = inject(DocumentSheetStoreSymbol) as MaterialStore;
</script>

<style lang="scss" scoped>
</style>
