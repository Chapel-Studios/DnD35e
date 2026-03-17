<template>
  <CheckBoxFormGroup
    :editable="isEditable"
    label="Is Weightless When Equipped"
    :value="isWeightlessWhenEquipped"
    :on-update="updater"
    field-path="system.isWeightlessWhenEquipped"
  />
</template>
<script setup lang="ts">
  import type { EquippableDocumentStore } from '@items/components/Equippable/index.mjs';
  import { CheckBoxFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    isEditable,
    equippableGetters: {
      isWeightlessWhenEquipped,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject('documentSheetStore') as EquippableDocumentStore;

  const updater = getDirectFieldUpdater('system.isWeightlessWhenEquipped');
</script>
