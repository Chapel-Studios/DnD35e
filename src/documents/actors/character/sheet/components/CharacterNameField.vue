<template>
  <div class="character-name-field">
    <TextFormGroup
      :value="formulaString"
      field-path="system.nameFormula.formula"
      class="character-name-input contents"
    >
      <template #readonly>
        <DocumentName :value="displayValue" />
      </template>
    </TextFormGroup>
  </div>
</template>

<script lang="ts" setup>
  import type { DocumentSheetStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import DocumentName from '@documents/document/sheet/components/DocumentName.vue';
  import type { FormulaData } from '@helpers/formulae/FormulaData.mjs';
  import { TextFormGroup } from '@vc/fields/index.mjs';
  import { computed, inject } from 'vue';

  const fieldPath = 'system.nameFormula';

  const {
    documentGetters: { name, getViewAwareFieldValue },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const formulaData   = computed(() => getViewAwareFieldValue<FormulaData | null>(fieldPath) ?? null);
  const formulaString = computed(() => formulaData.value?.formula ?? '');
  const displayValue  = computed(() => name.value || '—');
</script>

<style scoped lang="scss">
  .character-name-field {
    display: contents;
  }

  .character-name-input {
    width: 100%;
    font-size: 1.6rem;
    font-weight: bold;
    font-family: inherit;
    border: none;
    border-bottom: 1px solid var(--color-border-light-2, #ccc);
    background: transparent;
    color: var(--color-text-dark-primary, #191813);
    padding: 0.1rem 0.2rem;
    outline: none;

    &:focus {
      border-bottom-color: var(--color-text-hyperlink, #c00);
    }
  }
</style>
