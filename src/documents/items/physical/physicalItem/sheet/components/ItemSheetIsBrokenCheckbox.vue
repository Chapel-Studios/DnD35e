<template>
  <CheckBoxFormGroup
    label="dnd35e.ITEM.IsBroken"
    :value="isBroken"
    :on-update="toggleBroken"
    field-path="system.isBroken"
    default-editability="gmOnly"
    edit-derived
  />
</template>
<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { PhysicalDocumentStore } from '@items/physical/physicalItem/sheet/index.mjs';
  import { CheckBoxFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: { isBroken },
    documentActions: { toggleBroken },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;
</script>
