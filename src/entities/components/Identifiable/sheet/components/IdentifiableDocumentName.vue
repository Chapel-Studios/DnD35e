<template>
  <div class="identifiable-header-main">
    <!-- Show identified name -->
    <DocumentName
      v-if="showIdentified"
      :label-key="identifiedLabelKey"
      :value="identifiedValue"
    />

    <!-- Show unidentified name -->
    <DocumentName
      v-if="showUnidentified"
      label-key="D35E.UnidentifiedName"
      :value="unidentifiedDisplayName"
    />
  </div>
</template>

<script setup lang="ts">
  import { DocumentName } from '@ec/CoreMixin/index.mjs';
  import type { IdentifiableDocumentStore } from '@ec/Identifiable/index.mjs';
  import { computed, inject } from 'vue';

  const {
    unidentifiedVisibilityMode: {
      showBoth,
      showIdentified,
      showUnidentified,
    },
    documentGetters: {
      displayName,
    },
    identifiableGetters: {
      identifiedDisplayName,
      unidentifiedDisplayName,
    },
  } = inject('documentSheetStore') as IdentifiableDocumentStore;

  const identifiedValue = computed(() => showBoth.value
    ? identifiedDisplayName
    : displayName
  );
  const identifiedLabelKey = computed(() => showBoth.value
    ? 'D35E.IdentifiedName'
    : 'D35E.ItemName'
  );
</script>

<style scoped lang="scss">
  .identifiable-header-main {
    display: flex;
    flex-direction: column;
    margin-top: 0.5rem;

    h4 {
        text-decoration: underline;
    }

    h3, h4 {
        margin: 0;
    }
  }
</style>
