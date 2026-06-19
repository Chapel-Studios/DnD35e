<template>
  <SelectFormGroup
    field-path="showIcon"
    :options="showIconOptions"
  />
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { SelectFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  import type { ActiveEffectConfigStore } from '../ActiveEffectConfigStore.mjs';

  const {
    documentGetters: {
      showIconOptions,
    },
  } = inject(DocumentSheetStoreSymbol) as ActiveEffectConfigStore;
</script>

<style lang="scss" scoped>
</style>
