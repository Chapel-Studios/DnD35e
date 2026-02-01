<template>
  <section
    class="description"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="description"
  >
    <RichTextEditor field="system.description.value" :label="label" />
  </section>
</template>

<script setup lang="ts">
  import { RichTextEditor } from "@vc/Fields/index.mjs";
  import { ItemSheetStore } from "../index.mjs";
  import { inject } from "vue";

  const {
    tabs: {
      tabGetters: { getIsTabOpen },
    },
  } = inject('itemSheetStore') as ItemSheetStore;

  const isActiveTab = getIsTabOpen('description');

  const label = game.i18n.localize("D35E.Description");
</script>

<style scoped>
  .flexcol {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .description {
    label {
      font-size: 1.25rem;
      text-decoration: underline;
    }
    .form-fields {
      margin-top: 0.5rem;
    }
  }
</style>
