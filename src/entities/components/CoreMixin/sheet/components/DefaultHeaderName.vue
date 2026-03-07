<template>
  <HeaderNameField
    :display-value="displayName"
    :edit-value="nameFormula"
    field-path="system.nameFormula"
  />
</template>

<script lang="ts" setup>
  import { HeaderNameField } from '@ec/CoreMixin/index.mjs';
  import type { DocumentSheetStore } from '@ec/CoreMixin/sheet/useDocumentSheetStore.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: { displayName, nameFormula },
  } = inject('documentSheetStore') as DocumentSheetStore;
</script>