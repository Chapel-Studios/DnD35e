<template>
  <div class="name-config">
    <div class="header-row">
      <h3 class="form-header">{{ localize(heading) }}</h3>
      <i v-if="showEffectHelper" class="fa-solid fa-wand-magic-sparkles"></i>
      
      <FormGroup
        class="name-formula-group"
        :label="localize(toggleLabel).value"
        type="checkbox"
        :value="toggleValue"
        :editable="isEditable"
        :onUpdate="getFieldUpdater(toggleField)"
      />
    </div>

    <!-- Show direct name input if not using formula -->
    <FormGroup
      v-if="!toggleValue"
      :label="localize(nameLabel).value"
      type="text"
      :value="nameValue"
      :editable="isEditable"
      :onUpdate="getFieldUpdater(nameField)"
    />
    <FormGroup
      v-if="toggleValue"
      :label="localize(formulaLabel).value"
      type="text"
      :value="formulaValue"
      :editable="isEditable"
      :onUpdate="getFieldUpdater(formulaField)"
    />

    <!-- Not sure if this message still makes sense. We can add something back here if we want later -->
    <!-- <p v-if="toggleValue" class="notes">
      {{ localize("D35E.UsesNameFromFormula") }}
    </p> -->
  </div>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { FormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  interface Props {
    heading?: string;

    nameLabel?: string;
    nameField?: string;
    nameValue: string;

    toggleField?: string;
    toggleLabel?: string;
    toggleValue: boolean;

    formulaField?: string;
    formulaLabel?: string;
    formulaValue: string;

    showEffectHelper?: boolean;
  }

  const {
    localize,
    isEditable,
    documentActions: {
      getFieldUpdater,
    },
  } = inject('documentSheetStore') as DocumentSheetStore;

  withDefaults(defineProps<Props>(), {
    heading: 'D35E.ItemName',
    // Name
    nameLabel: 'D35E.ItemName',
    nameField: 'name',

    toggleLabel: 'D35E.UseNameFromFormula',
    toggleField: 'system.isNameFromFormula',

    formulaLabel: 'D35E.CustomNameFormula',
    formulaField: 'system.nameFormula',

    showEffectHelper: false,
  });


</script>

<style scoped lang="scss">
  .name-config {
    display: contents;
  }

  .header-row {
    grid-column: span 2;
    display: grid;
    grid-auto-flow: column;
    align-items: center;
    justify-content: space-between;

    .form-header {
      margin: 1rem 0 0.25rem;
      text-decoration: underline;
    }

    .name-formula-group {
      display: inline-grid;
      grid-auto-flow: column;
      align-items: center;
    }
  }

  .notes {
    margin: -0.75rem 0 0.125rem;
    grid-column: span 2;
  }

  .form-group {
    display: contents;
  }
</style>
