<template>
  <section
    class="overview"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="details"
  >
    <div class="form-container">
      <!-- NAME CONFIGURATION SECTION -->
      <slot name="name-section">
        <NameConfig
          :heading="nameHeading"
          :nameLabel="nameLabel"
          :nameValue="name"
          :toggleValue="isNameFromFormula"
          :formulaValue="nameFormula"
        />
      </slot>

      <!-- DESCRIPTION SECTION -->
      <slot name="description-section">
        <DescriptionEditor />
      </slot>

      <!-- SLOT FOR ADDITIONAL CONTENT -->
      <slot></slot>

      <!-- GM-ONLY SECTION -->
      <template v-if="userIsGM">
        <h3 class="form-header">{{ localize("D35E.SystemProperties") }}</h3>
        <slot name="gm-section">
          <UniqueId />
        </slot>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import DescriptionEditor from '@ec/CoreMixin/sheet/components/DescriptionEditor.vue';
  import NameConfig from '@ec/CoreMixin/sheet/components/NameConfig.vue';
  import { UniqueId } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  interface Props {
    nameHeading?: string;
    nameLabel?: string;
  }

  withDefaults(defineProps<Props>(), {
    nameHeading: 'D35E.ItemName',
    nameLabel: 'D35E.ItemName',
  });

  defineSlots<{
    'name-section'(): any;
    'description-section'(): any;
    default(): any;
    'gm-section'(): any;
  }>();

  const store = inject('documentSheetStore') as DocumentSheetStore;
  const {
    tabs: {
      tabGetters: { getIsTabOpen },
    },
    documentGetters: {
      name,
      isNameFromFormula,
      nameFormula,
    },
    localize,
  } = store;

  const isActiveTab = getIsTabOpen('details');
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
