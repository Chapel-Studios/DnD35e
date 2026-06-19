<template>
  <CheckBoxFormGroup
    :on-update="toggleMasterwork"
    field-path="system.isMasterwork"
    default-editability="gmOnly"
  />
</template>
<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { EquippableDocumentStore } from '@items/physical/equippableItem/sheet/index.mjs';
  import { CheckBoxFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentActions: { toggleMasterwork },
  } = inject(DocumentSheetStoreSymbol) as EquippableDocumentStore;

  // Domain callback: toggling masterwork applies item-specific logic beyond a raw boolean write.
</script>
