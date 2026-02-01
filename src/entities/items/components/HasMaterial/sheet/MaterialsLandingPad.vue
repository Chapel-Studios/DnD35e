<template>
  <LandingPad
    :uuids="materials"
    :acceptedTypes="['material']"
    :is-editable="isEditable"
    :onAddItem="onDrop"
    :onRemoveItem="removeMaterial"
  />
</template>

<script setup lang="ts">
import LandingPad from '@vc/LandingPad.vue';
import { inject } from 'vue';
import type { ItemWithMaterialsStore } from './ItemWithMaterialsStore.mjs';
import type { ItemSheetStore } from '@items/baseItem/index.mjs';

const {
  itemWithMaterialsGetters: {
    materials,
  },
  documentActions: {
    getFieldUpdater,
  },
  isEditable,
} = inject('itemSheetStore') as ItemWithMaterialsStore & ItemSheetStore;
const updater = getFieldUpdater('system.materials');

const onDrop = async (newUuid: string) => {
  updater([
    ...materials.value,
    newUuid,
  ]);
};

const removeMaterial = async (uuid: string) => {
  await updater([
    ...materials.value.filter(m => m !== uuid),
  ]);
}
</script>