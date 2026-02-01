<template>
  <ToggleSwitch
    name="system.isIdentifiable"
    label="D35E.IsIdentifiable"
    true-label="D35E.Yes"
    false-label="D35E.No"
    :checked="isIdentifiable"
    :editable="isEditable"
    @update="handleToggleUpdate"
  />
</template>

<script setup lang="ts">
  import { inject } from "vue";
  import { IdentifiableItemStore } from "@items/components/Identifiable/index.mjs";
  import { ToggleSwitch } from '@vc/Fields/index.mjs';

  const {
    identifableGetters: {
      isIdentifiable,
    },
    documentActions: {
      getFieldUpdater,
    },
    isEditable,
  } = inject('itemSheetStore') as IdentifiableItemStore;

  // For some reason vue doesn't like using the result of getFieldUpdater directly on the emitter /shrug
  const handleToggleUpdate = (value: boolean) => getFieldUpdater('system.isIdentifiable')(value);
</script>