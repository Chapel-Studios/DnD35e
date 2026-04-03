<template>
  <div v-if="showEditor" class="name-field">
    <!--  see display node memo bellow -->
    <div v-if="!isEditViewMode" class="flexrow">
      <div class="flexcol">
        <DocumentName :value="displayValue" />
      </div>
    </div>

    <div v-else class="name-formula-inline">
      <FormulaFormGroup
        :formula-data="formulaData"
        :onUpdate="onUpdate"
        :field-path="fieldPath"
      >
      </FormulaFormGroup>
    </div>
  </div>
</template>

<script lang="ts" setup>
/**
 * Display Node memo:
 * We are using our own display mode to hide formula familiar hints when not editing
 * TODO: maybe this should be refactored into Formula form group?
 * Do we really want to show context hints when not editing a formula?
 * Maybe we want to show them when hovering the display value?
 * We tried setting up a read only slot but there were a lot of styling concerns so was put off as a todo
 */
  import type { DocumentSheetStore } from '@ec/CoreMixin/sheet/DocumentSheetStore.mjs';
  import type { FormulaData } from '@helpers/formulae/FormulaData.mjs';
  import { FormulaFormGroup } from '@helpers/formulae/index.mjs';
  import { computed, inject } from 'vue';

  import { DocumentSheetStoreSymbol, RenderModeStore, RenderModeStoreSymbol } from '../index.mjs';
  import DocumentName from './DocumentName.vue';

  const fieldPath = 'system.nameFormula';
  const {
    documentActions: { getDirectFieldUpdater },
    documentGetters: { name, getIsFieldVisible },
    _storeUtils: { getProperty },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;
  const {
    isEditViewMode,
    isIdentifiedViewMode,
  } = inject(RenderModeStoreSymbol) as RenderModeStore;

  const formulaDataRef = getProperty<FormulaData | null>(fieldPath);
  const formulaData = computed(() => formulaDataRef.value ?? null);

  const displayValue = computed(() => name.value || '—');
  const showEditor = computed((): boolean => {
    if (!isEditViewMode.value) return false;
    return getIsFieldVisible(fieldPath).value;
  });

  /**
   * Save the formula string. View mode determines which sub-field is written:
   * - identified view → system.nameFormula.formula
   * - unidentified view → system.nameFormula.unidentifiedFormula
   */
  const onUpdate = (formula: string) => {
    const subField = isIdentifiedViewMode.value ? 'formula' : 'unidentifiedFormula';
    return getDirectFieldUpdater(`${fieldPath}.${subField}`)(formula || null);
  };
</script>

<style scoped lang="scss">
  .name-field {
    display: contents;
  }

  .name-formula-inline {
    display: contents;
  }

  /* Ensure the hint appears below the input, not beside it */
  :deep(.form-group-hint),
  :deep(p.hint) {
    display: block;
    width: 100%;
    margin-top: 0.25rem;
    margin-left: 0 !important;
    text-align: left;
  }
</style>
