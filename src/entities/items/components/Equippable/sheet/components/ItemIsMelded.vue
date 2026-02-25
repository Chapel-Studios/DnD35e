<template>
  <CheckBoxFormGroup
    :editable="isEditable"
    label="Is Weightless When Equipped"
    :value="isWeightlessWhenEquipped"
    :on-update="updater"
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
      getFieldUpdater,
    },
  } = inject('documentSheetStore') as EquippableDocumentStore;

  const updater = getFieldUpdater('system.isWeightlessWhenEquipped');
</script>
