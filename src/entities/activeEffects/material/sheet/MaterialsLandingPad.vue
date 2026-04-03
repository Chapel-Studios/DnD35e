<template>
  <LandingPad
    :uuids="materials"
    :acceptedTypes="['material']"
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
