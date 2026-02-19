<template>
  <section
    class="flexcol description"
    data-group="primary"
    data-tab="description"
    v-show="isActiveTab"
  >
    <RichTextEditor v-if="showIdentified" field="system.description.value" :label="identifiedLabel" />

    <hr v-if="showBoth" />

    <RichTextEditor v-if="showUnidentified" field="system.unidentifiedInfo.unidentifiedDescription" label="D35E.UnidentifiedDescription" />
  </section>
</template>

<script setup lang="ts">
  import type { IdentifiableDocumentStore } from '@ec/Identifiable/index.mjs';
  import { RichTextEditor } from '@vc/Fields/index.mjs';
  import { computed, inject } from 'vue';

  const {
    tabs: {
      tabGetters: { getIsTabOpen },
    },
    unidentifiedInfoMode: {
      showBoth,
      showIdentified,
      showUnidentified,
    },
  } = inject('documentSheetStore') as IdentifiableDocumentStore;
  const isActiveTab = getIsTabOpen('description');

  const identifiedLabel = computed(() => showBoth
    ? game.i18n.localize('D35E.IdentifiedDescription')
    : game.i18n.localize('D35E.Description'),
  );
</script>

<style scoped>
  .description {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
