<template>
  <div v-if="showEditor" class="name-field">
    <!--  see display node memo bellow -->
    <div v-if="!isEditMode" class="flexrow">
      <div class="flexcol">
        <DocumentName :value="displayValue" />
      </div>
    </div>

    <div v-else class="name-formula-inline">
      <FormulaFormGroup
        :value="formulaString"
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
 * TODO(Phase 7): evaluate refactoring into FormulaFormGroup as a displayMode prop or slot.
 * Do we really want to show context hints when not editing a formula?
 * Maybe we want to show them when hovering the display value?
 * We tried setting up a read only slot but there were a lot of styling concerns so was put off as a todo
 */
  import type { DocumentSheetStore } from '@documents/document/sheet/DocumentSheetStore.mjs';
  import { FormulaFormGroup } from '@helpers/formulae/index.mjs';
  import { computed, inject } from 'vue';

  import type { RenderModeStore } from '../index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '../index.mjs';
  import DocumentName from './DocumentName.vue';

  const fieldPath = 'system.nameFormula';
  const {
    documentActions: { getViewAwareFieldUpdater },
    documentGetters: { name, getIsFieldVisible, getViewAwareFieldValue },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;
  const {
    isEditMode,
  } = inject(RenderModeStoreSymbol) as RenderModeStore;

  /**
   * Read the raw formula string as a primitive so Vue tracks it by value, not
   * by reference. FormulaData is a DataModel instance — if we pass the whole
   * object to FormulaFormGroup, Vue cannot detect in-place mutations of
   * `.formula` (same object reference = no reactivity trigger).
   */
  const formulaString = computed((): string =>
    getViewAwareFieldValue<string>(`${fieldPath}.formula`) ?? ''
  );

  const displayValue = computed(() => name.value || '—');
  const showEditor = computed((): boolean => {
    return getIsFieldVisible(fieldPath).value;
  });

  /**
   * Save the formula string.
   */
  const onUpdate = (formula: string) => {
    return getViewAwareFieldUpdater(`${fieldPath}.formula`)(formula || null);
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
