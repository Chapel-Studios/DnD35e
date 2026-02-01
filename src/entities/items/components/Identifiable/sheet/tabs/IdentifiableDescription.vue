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
  import { computed, inject } from "vue";
  import { RichTextEditor } from "@vc/Fields/index.mjs";
  import type { IdentifiableItemStore } from "./index.mjs";
import { IdentifiableItemLike } from "../index.mjs";

  const {
    tabs: {
      tabGetters: { getIsTabOpen },
    },
    unidentifiedInfoMode: {
      showBoth,
      showIdentified,
      showUnidentified,
    },
  } = inject('itemSheetStore') as IdentifiableItemStore<IdentifiableItemLike>;
  const isActiveTab = getIsTabOpen('description');

  const identifiedLabel = computed(() => showBoth
    ? game.i18n.localize("D35E.IdentifiedDescription")
    : game.i18n.localize("D35E.Description")
  );
</script>

<style scoped>
  .description {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
