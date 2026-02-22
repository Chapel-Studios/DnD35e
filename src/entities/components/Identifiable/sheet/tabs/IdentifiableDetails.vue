<template>
  <Details>
    <!-- IDENTIFIABLE NAME SECTION -->
    <template #name-section>
      <NameConfig
        v-if="showIdentified"
        heading="D35E.IdentifiedName"
        nameLabel="D35E.ItemName"
        :nameValue="name"
        nameField="name"
        :toggleValue="isNameFromFormula"
        toggleField="system.isNameFromFormula"
        toggleLabel="D35E.UseNameFromFormula"
        :formulaValue="nameFormula"
        formulaField="system.nameFormula"
        formulaLabel="D35E.CustomNameFormula"
      />

      <NameConfig
        v-if="showUnidentified"
        heading="D35E.UnidentifiedName"
        nameLabel="D35E.UnidentifiedName"
        :nameValue="unidentifiedName"
        nameField="system.unidentifiedInfo.unidentifiedName"
        :toggleValue="isUnidentifiedNameFromFormula"
        toggleField="system.unidentifiedInfo.isUnidentifiedNameFromFormula"
        toggleLabel="D35E.UseUnidentifiedNameFromFormula"
        :formulaValue="unidentifiedNameFormula"
        formulaField="system.unidentifiedInfo.unidentifiedNameFormula"
        formulaLabel="D35E.UnidentifiedNameFormula"
      />
    </template>

    <!-- IDENTIFIABLE DESCRIPTION SECTION -->
    <template #description-section>
      <DescriptionEditor v-if="showIdentified" heading="D35E.Description" />

      <DescriptionEditor
        v-if="showUnidentified"
        heading="D35E.UnidentifiedDescription"
        field="system.unidentifiedInfo.unidentifiedDescription"
      />
    </template>
    
    <slot></slot>

    <!-- GM-ONLY SECTION -->
    <template #gm-section>
      <IdentifiableConfig />
      <UniqueId />
    </template>
  </Details>
</template>

<script setup lang="ts">
  import DescriptionEditor from '@ec/CoreMixin/sheet/components/DescriptionEditor.vue';
  import NameConfig from '@ec/CoreMixin/sheet/components/NameConfig.vue';
  import type { IdentifiableDocumentStore } from '@ec/Identifiable/index.mjs';
  import { IdentifiableConfig } from '@ec/Identifiable/index.mjs';
  import Details from '@items/baseItem/sheet/tabs/Details.vue';
  import { UniqueId } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    unidentifiedInfoMode: {
      showIdentified,
      showUnidentified,
    },
    documentGetters: {
      name,
      isNameFromFormula,
      nameFormula,
    },
    identifiableGetters: {
      unidentifiedName,
      isUnidentifiedNameFromFormula,
      unidentifiedNameFormula,
    },
  } = inject('documentSheetStore') as IdentifiableDocumentStore;

</script>

<style scoped>
  .notes {
    margin: -0.75rem 0 0.125rem;
    grid-column: span 2;
  }
</style>
