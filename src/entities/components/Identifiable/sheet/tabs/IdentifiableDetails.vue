<template>
  <Details>
    <!-- IDENTIFIABLE DESCRIPTION SECTION -->
    <template #description-section>
      <DescriptionEditor v-if="showIdentified" heading="D35E.Description" />

      <DescriptionEditor
        v-if="showUnidentified"
        heading="D35E.UnidentifiedDescription"
        field="system.unidentifiedDescription"
      />
    </template>
    
    <slot></slot>

    <!-- GM-ONLY SECTION -->
    <template #gm-section>
      <UniqueId />
    </template>
  </Details>
</template>

<script setup lang="ts">
  import DescriptionEditor from '@ec/CoreMixin/sheet/components/DescriptionEditor.vue';
  import type { IdentifiableDocumentStore } from '@ec/Identifiable/index.mjs';
  import Details from '@items/baseItem/sheet/tabs/Details.vue';
  import { UniqueId } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    unidentifiedVisibilityMode: {
      showIdentified,
      showUnidentified,
    },
  } = inject('documentSheetStore') as IdentifiableDocumentStore;

</script>

<style scoped>
  .notes {
    margin: -0.75rem 0 0.125rem;
    grid-column: span 2;
  }
</style>
