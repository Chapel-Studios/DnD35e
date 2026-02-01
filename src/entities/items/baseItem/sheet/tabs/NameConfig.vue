<template>
  <section
    class="name-config"
    v-show="isActive"
    data-group="primary"
    data-tab="name-config"
  >
    <div class="form-container">
      <!-- Item Name -->
      <FormGroup
        label="D35E.ItemName"
        type="text"
        :value="name"
        :disabled="isNameFromFormula"
        :editable="isEditable"
        :onUpdate="getFieldUpdater('name')"
      />

      <!-- Use Name From Formula -->
      <FormGroup
        label="D35E.UseNameFromFormula"
        type="checkbox"
        :value="isNameFromFormula"
        :editable="isEditable"
        :onUpdate="getFieldUpdater('system.isNameFromFormula')"
      />

      <!-- Custom Name Formula -->
      <FormGroup
        label="D35E.CustomNameFormula"
        type="text"
        :value="nameFormula"
        :disabled="!isNameFromFormula"
        :editable="isEditable"
        :onUpdate="getFieldUpdater('system.nameFormula')"
      />

      <!-- Notes -->
      <p v-if="isNameFromFormula" class="notes">
        {{ t("D35E.UsesNameFromFormula") }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
  import FormGroup from "@vc/Fields/FormGroup.vue";
  import { inject } from "vue";
  import { ItemSheetStore } from "../index.mjs";

  const {
    documentGetters: {
      name,
      isNameFromFormula,
      nameFormula,
    },
    documentActions: {
      getFieldUpdater,
    },
    tabs: {
      tabGetters: { getIsTabOpen },
    },
    isEditable,
  } = inject('itemSheetStore') as ItemSheetStore;

  const isActive = getIsTabOpen('name-config');

  function t(key: string) {
    return game.i18n.localize(key);
  }
</script>

<style scoped>
  .form-container {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 1rem 3rem;
    align-items: center;
  }

  label {
    justify-self: start;
    align-self: center;
  }

  .notes {
    margin: -0.75rem 0 0.125rem;
    grid-column: span 2;
  }

  .form-header {
    grid-column: span 2;
    margin: 1rem 0 0.25rem;
    text-decoration: underline;
  }

  .form-group {
    display: contents;
  }
</style>
