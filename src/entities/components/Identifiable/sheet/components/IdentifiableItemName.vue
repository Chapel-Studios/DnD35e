<template>
  <div class="identifiable-header-main">
    <!-- Identified or Both -->
    <ItemName
      v-if="showIdentified"
      :label-key="identifiedLabelKey"
      :value="identifiedValue"
    />

    <!-- Divider when showing both -->
    <hr v-if="showBoth" />

    <!-- Unidentified or Both -->
    <ItemName
      v-if="showUnidentified"
      label-key="D35E.UnidentifiedName"
      :value="unidentifiedDisplayName"
    />
  </div>
</template>

<script setup lang="ts">
  import type { IdentifiableDocumentStore } from '@ec/Identifiable/index.mjs';
  import { ItemName } from '@items/baseItem/index.mjs';
  import { computed, inject } from 'vue';

  const {
    unidentifiedInfoMode: {
      showBoth,
      showIdentified,
      showUnidentified,
    },
    documentGetters: {
      displayName,
    },
    identifableGetters: {
      isIdentifiable,
      identifiedDisplayName,
      unidentifiedDisplayName,
    },
  } = inject('documentSheetStore') as IdentifiableDocumentStore;

  const identifiedValue = computed(() => showBoth
    ? identifiedDisplayName
    : displayName,
  );
  const identifiedLabelKey = computed(() => isIdentifiable && showBoth
    ? 'D35E.IdentifiedName'
    : 'D35E.ItemName',
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

    hr {
        margin: 0.5rem 0;
    }
  }
</style>
