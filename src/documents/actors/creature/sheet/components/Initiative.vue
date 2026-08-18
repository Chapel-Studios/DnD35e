<template>
  <NumberFormGroup
    field-path="system.init"
    read-only
    :class="{ 'rollable-cursor': isRollable }"
    :role="isRollable ? 'button' : undefined"
    :tabindex="isRollable ? 0 : undefined"
    @click="onClick"
    @keydown.enter="onClick"
    @keydown.space.prevent="onClick"
  />
</template>

<script setup lang="ts">
  import type { CreatureDocumentStore } from '@actors/creature/sheet/CreatureStore.mjs';
  import type { RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { NumberFormGroup } from '@vc/fields/index.mjs';
  import { computed, inject } from 'vue';

  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentActions: { rollInitiativeFromSheet },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;

  // Rollable in play/true mode — edit mode is for GMs authoring the source value.
  const isRollable = computed(() => !isEditMode.value);

  const onClick = (): void => {
    if (!isRollable.value) return;
    void rollInitiativeFromSheet();
  };
</script>

<style lang="scss" scoped>
</style>
