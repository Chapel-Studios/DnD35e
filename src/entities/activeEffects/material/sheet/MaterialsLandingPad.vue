<template>
  <LandingPad
    :uuids="materials"
    :acceptedTypes="[materialEffectType]"
    :is-editable="isEditViewMode"
    :onRemoveItem="removeMaterial"
  />
</template>

<script setup lang="ts">
  /**
   * @deprecated This component is currently unused. Slated for refactoring or removal.
   */
  import { DocumentSheetStoreSymbol, RenderModeStore, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import LandingPad from '@vc/components/LandingPad.vue';
  import { inject } from 'vue';

  import { materialEffectType } from '../index.mjs';
  const { isEditViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: {
      materials,
    },
    documentActions: {
      removeEffect,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;

  // const onDrop = async (newUuid: string) => {
  //   updater([
  //     ...materials.value,
  //     newUuid,
  //   ]);
  // };

  const removeMaterial = async (uuid: string) => {
    await removeEffect(uuid);
  };
</script>
