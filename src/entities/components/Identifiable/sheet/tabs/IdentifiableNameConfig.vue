<template>
  <section
    class="name-config"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="name-config"
  >

    <!-- IDENTIFIED BLOCK -->
    <template v-if="showIdentified">
      <div class="form-container">

        <!-- Name -->
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

        <!-- Name Formula -->
        <FormGroup
          label="D35E.CustomNameFormula"
          type="text"
          :value="nameFormula"
          :disabled="!isNameFromFormula"
          :editable="isEditable"
          :onUpdate="getFieldUpdater('system.nameFormula')"
        />

        <p v-if="isNameFromFormula" class="notes">
          {{ t("D35E.UsesNameFromFormula") }}
        </p>
      </div>
    </template>

    <!-- DIVIDER -->
    <hr v-if="showBoth" />

    <!-- UNIDENTIFIED BLOCK -->
    <template v-if="showUnidentified">
      <div class="form-container">

        <!-- Unidentified Name -->
        <FormGroup
          label="D35E.UnidentifiedName"
          type="text"
          :value="unidentifiedName"
          :disabled="isUnidentifiedNameFromFormula"
          :editable="isEditable"
          :onUpdate="getFieldUpdater('system.unidentifiedInfo.unidentifiedName')"
        />

        <!-- Use Unidentified Name From Formula -->
        <FormGroup
          label="D35E.UseUnidentifiedNameFromFormula"
          type="checkbox"
          :value="isUnidentifiedNameFromFormula"
          :editable="isEditable"
          :onUpdate="getFieldUpdater('system.unidentifiedInfo.isUnidentifiedNameFromFormula')"
        />

        <!-- Unidentified Name Formula -->
        <FormGroup
          label="D35E.CustomNameFormula"
          type="text"
          :value="unidentifiedNameFormula"
          :disabled="!isUnidentifiedNameFromFormula"
          :editable="isEditable"
          :onUpdate="getFieldUpdater('system.unidentifiedInfo.unidentifiedNameFormula')"
        />

        <p v-if="isUnidentifiedNameFromFormula" class="notes">
          {{ t("D35E.UsesNameFromFormula") }}
        </p>
      </div>
    </template>

  </section>
</template>

<script setup lang="ts">
  import { inject } from 'vue';
  import { FormGroup } from '@vc/Fields/index.mjs';
  import { IdentifiableItemStore } from './index.mjs';

  const {
    tabs: {
      tabGetters: { getIsTabOpen },
    },
    documentGetters: {
      name,
      isNameFromFormula,
      nameFormula,
    },
    documentActions: { getFieldUpdater },
    identifableGetters: {
      unidentifiedName,
      isUnidentifiedNameFromFormula,
      unidentifiedNameFormula,
    },
    unidentifiedInfoMode: {
      showIdentified,
      showUnidentified,
      showBoth,
    },
    isEditable,
  } = inject('itemSheetStore') as IdentifiableItemStore;

  const isActiveTab = getIsTabOpen('name-config');

  // --- Localization helper ---
  function t (key: string) {
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

  .notes {
    margin: -0.75rem 0 0.125rem;
    grid-column: span 2;
  }
</style>
