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
  import { IdentifiableDocumentStore } from '@ec/Identifiable/index.mjs';
  import { ToggleSwitch } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    identifiableGetters: {
      isIdentifiable,
    },
    documentActions: {
      getFieldUpdater,
    },
    isEditable,
  } = inject('documentSheetStore') as IdentifiableDocumentStore;

  // For some reason vue doesn't like using the result of getFieldUpdater directly on the emitter /shrug
  const handleToggleUpdate = (value: boolean) => getFieldUpdater('system.isIdentifiable')(value);
</script>
