<template>
  <NumberFormGroup
    field-path="system.speed.land.base"
    direct-update
    unit="ft."
  >
    <template #readonly>
      <span>{{ landSpeedTotal }} ft.</span>
    </template>
  </NumberFormGroup>
</template>

<script setup lang="ts">
  import type { CreatureDocumentStore } from '@actors/creature/sheet/CreatureStore.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { NumberFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: { landSpeedTotal },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;
</script>
