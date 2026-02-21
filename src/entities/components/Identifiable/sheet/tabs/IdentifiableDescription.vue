<template>
  <section
    class="overview"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="description"
  >
    <div class="form-container">
      <!-- NAME CONFIGURATION SECTION -->
      <template v-if="showIdentified">
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
      </template>

      <template v-if="showUnidentified">
        <h3 class="form-header">{{ localize("D35E.UnidentifiedName") }}</h3>

        <FormGroup
          label="D35E.UnidentifiedName"
          type="text"
          :value="unidentifiedName"
          :disabled="isUnidentifiedNameFromFormula"
          :editable="isEditable"
          :onUpdate="getFieldUpdater('system.unidentifiedInfo.unidentifiedName')"
        />

        <FormGroup
          label="D35E.UseUnidentifiedNameFromFormula"
          type="checkbox"
          :value="isUnidentifiedNameFromFormula"
          :editable="isEditable"
          :onUpdate="getFieldUpdater('system.unidentifiedInfo.isUnidentifiedNameFromFormula')"
        />

        <FormGroup
          label="D35E.CustomNameFormula"
          type="text"
          :value="unidentifiedNameFormula"
          :disabled="!isUnidentifiedNameFromFormula"
          :editable="isEditable"
          :onUpdate="getFieldUpdater('system.unidentifiedInfo.unidentifiedNameFormula')"
        />

        <p v-if="isUnidentifiedNameFromFormula" class="notes">
          {{ localize("D35E.UsesNameFromFormula") }}
        </p>
      </template>

      <!-- DESCRIPTION SECTION -->
      <h3 class="form-header">{{ showBoth ? (showIdentified ? "D35E.IdentifiedDescription" : "D35E.UnidentifiedDescription") : "D35E.Description" }}</h3>

      <RichTextEditor
        v-if="showIdentified"
        field="system.description.value"
      />

      <RichTextEditor
        v-if="showUnidentified"
        field="system.unidentifiedInfo.unidentifiedDescription"
      />

      <!-- GM-ONLY SECTION -->
      <template v-if="userIsGM">
        <h3 class="form-header">{{ localize("D35E.SystemProperties") }}</h3>
        <IdentifiableConfig />
        <UniqueId />
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
  import type { IdentifiableDocumentStore } from '@ec/Identifiable/index.mjs';
  import { IdentifiableConfig } from '@ec/Identifiable/index.mjs';
  import { FormGroup, UniqueId } from '@vc/Fields/index.mjs';
  import { RichTextEditor } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    tabs: {
      tabGetters: { getIsTabOpen },
    },
    unidentifiedInfoMode: {
      showBoth,
      showIdentified,
      showUnidentified,
    },
    documentGetters: {
      name,
      isNameFromFormula,
      nameFormula,
    },
    documentActions: {
      getFieldUpdater,
    },
    identifiableGetters: {
      unidentifiedName,
      isUnidentifiedNameFromFormula,
      unidentifiedNameFormula,
    },
    isEditable,
    localize,
  } = inject('documentSheetStore') as IdentifiableDocumentStore;

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
