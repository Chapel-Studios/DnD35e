<template>
  <CheckBoxFormGroup
    :editable="isEditable"
    label="Is Melded"
    :value="isMelded"
    :on-update="updater"
    field-path="system.isMelded"
  />
</template>
<script setup lang="ts">
  import type { EquippableDocumentStore } from '@items/components/Equippable/index.mjs';
  import { CheckBoxFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    isEditable,
    equippableGetters: {
      isMelded,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject('documentSheetStore') as EquippableDocumentStore;

  const updater = getDirectFieldUpdater('system.isMelded');
</script>
