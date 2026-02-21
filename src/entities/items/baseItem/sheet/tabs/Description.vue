<template>
  <section
    class="overview"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="description"
  >
    <div class="form-container">
      <!-- NAME CONFIGURATION SECTION -->
      <h3 class="form-header">{{ localize("D35E.ItemName") }}</h3>

      <FormGroup
        label="D35E.ItemName"
        type="text"
        :value="name"
        :disabled="isNameFromFormula"
        :editable="isEditable"
        :onUpdate="getFieldUpdater('name')"
      />

      <FormGroup
        label="D35E.UseNameFromFormula"
        type="checkbox"
        :value="isNameFromFormula"
        :editable="isEditable"
        :onUpdate="getFieldUpdater('system.isNameFromFormula')"
      />

      <FormGroup
        label="D35E.CustomNameFormula"
        type="text"
        :value="nameFormula"
        :disabled="!isNameFromFormula"
        :editable="isEditable"
        :onUpdate="getFieldUpdater('system.nameFormula')"
      />

      <p v-if="isNameFromFormula" class="notes">
        {{ localize("D35E.UsesNameFromFormula") }}
      </p>

      <!-- DESCRIPTION SECTION -->
      <h3 class="form-header">{{ localize("D35E.Description") }}</h3>

      <RichTextEditor field="system.description.value" />

      <!-- GM-ONLY SECTION -->
      <template v-if="userIsGM">
        <h3 class="form-header">{{ localize("D35E.SystemProperties") }}</h3>
        <UniqueId />
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
  import type { ItemSheetStore } from '@items/baseItem/index.mjs';
  import { FormGroup, UniqueId } from '@vc/Fields/index.mjs';
  import { RichTextEditor } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    tabs: {
      tabGetters: { getIsTabOpen },
    },
    documentGetters: {
      name,
      isNameFromFormula,
      nameFormula,
    },
    documentActions: {
      getFieldUpdater,
    },
    isEditable,
    localize,
  } = inject('documentSheetStore') as ItemSheetStore;

  const isActiveTab = getIsTabOpen('description');
  const userIsGM = game.user.isGM;
</script>

<style scoped>
  .form-container {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 1rem 3rem;
    align-items: center;
  }

  .form-header {
    grid-column: span 2;
    margin: 1rem 0 0.25rem;
    text-decoration: underline;
  }

  .notes {
    margin: -0.75rem 0 0.125rem;
    grid-column: span 2;
  }

  .form-group {
    display: contents;
  }
</style>
