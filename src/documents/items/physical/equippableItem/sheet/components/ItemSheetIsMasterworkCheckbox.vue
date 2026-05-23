<template>
  <CheckBoxFormGroup
    label="dnd35e.EQUIPPABLE.FIELDS.isMasterwork.label"
    :value="isMasterwork"
    :on-update="toggleMasterwork"
    field-path="system.isMasterwork"
    default-editability="gmOnly"
    edit-derived
  />
</template>
<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { EquippableDocumentStore } from '@items/physical/equippableItem/sheet/index.mjs';
  import { CheckBoxFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: { isMasterwork },
    documentActions: { toggleMasterwork },
  } = inject(DocumentSheetStoreSymbol) as EquippableDocumentStore;
</script>
