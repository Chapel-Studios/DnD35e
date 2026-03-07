<template>
  <div class="identifiable-header-main">
    <HeaderNameField
      :display-value="identifiedValue"
      :edit-value="nameFormula"
      field-path="system.nameFormula"
      :show="showIdentified"
    />

    <HeaderNameField
      :display-value="unidentifiedDisplayName"
      :edit-value="unidentifiedNameFormula"
      field-path="system.unidentifiedNameFormula"
      :show="showUnidentified"
    />
  </div>
</template>

<script setup lang="ts">
  import { HeaderNameField } from '@ec/CoreMixin/index.mjs';
  import type { IdentifiableDocumentStore } from '@ec/Identifiable/index.mjs';
  import { computed, inject } from 'vue';

  const {
    unidentifiedVisibilityMode: {
      showBoth,
      showIdentifiedEditMode,
      showIdentifiedDisplayMode,
      showUnidentifiedEditMode,
      showUnidentifiedDisplayMode,
    },
    documentGetters: {
      displayName,
      nameFormula,
    },
    identifiableGetters: {
      identifiedDisplayName,
      unidentifiedDisplayName,
      unidentifiedNameFormula,
    },
  } = inject('documentSheetStore') as IdentifiableDocumentStore;

  const showIdentified = computed(() => showIdentifiedEditMode.value || showIdentifiedDisplayMode.value);
  const showUnidentified = computed(() => showUnidentifiedEditMode.value || showUnidentifiedDisplayMode.value);

  const identifiedValue = computed(() => {
    // If showing both identified and unidentified, prefer identifiedDisplayName
    // But fall back to displayName if identifiedDisplayName is empty
    if (showBoth.value) {
      return identifiedDisplayName.value || displayName.value;
    }
    return displayName.value;
  });
</script>

<style scoped lang="scss">
  .identifiable-header-main {
    display: contents;
  }
</style>
