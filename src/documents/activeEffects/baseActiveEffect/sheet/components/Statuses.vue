<template>
  <MultiSelectFormGroup
    class="grid-full-row"
    field-path="statuses"
    :options="statusOptions"
  />
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { MultiSelectFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  import type { ActiveEffectConfigStore } from '../ActiveEffectConfigStore.mjs';

  const {
    documentGetters: {
      statusOptions,
    },
  } = inject(DocumentSheetStoreSymbol) as ActiveEffectConfigStore;
</script>

<style lang="scss" scoped>
</style>
