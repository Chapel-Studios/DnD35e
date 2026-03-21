<template>
  <LandingPad
    :uuids="materials"
    :acceptedTypes="['material']"
    :is-editable="isEditable"
    :onRemoveItem="removeMaterial"
  />
</template>

<script setup lang="ts">
  /**
   * @deprecated This component is currently unused. Slated for refactoring or removal.
   */
  import { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import LandingPad from '@vc/components/LandingPad.vue';
  import { inject } from 'vue';


  const {
    documentGetters: {
      materials,
    },
    documentActions: {
      removeEffect,
    },
    isEditable,
  } = inject('documentSheetStore') as PhysicalDocumentStore;

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
