<template>
  <div v-if="show" class="name-field">
    <!-- Display mode -->
    <div v-if="!isEditable" class="flexrow">
      <div class="flexcol">
        <DocumentName :value="displayValueUnwrapped" />
      </div>
    </div>

    <!-- Edit mode with FormulaFormGroup (supports both text and formulas) -->
    <div v-else class="name-formula-inline">
      <FormulaFormGroup
        :value="editValueUnwrapped"
        :contexts="nameFormulaIntellisenseSchema"
        :onUpdate="onUpdate"
        :field-path="props.fieldPath"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { DocumentName } from '@ec/CoreMixin/index.mjs';
  import type { DocumentSheetStore } from '@ec/CoreMixin/sheet/useDocumentSheetStore.mjs';
  import { encodeContextType, FormulaFormGroup, hasIntellisenseSchema } from '@helpers/formulae/index.mjs';
  import type { FormulaFieldData } from '@helpers/formulae/types.mjs';
  import type { ComputedRef, Ref } from 'vue';
  import { computed, inject } from 'vue';

  interface Props {
    displayValue: string | ComputedRef<string> | Ref<string>;
    editValue: string | ComputedRef<string> | Ref<string>;
    fieldPath: string;
    show?: ComputedRef<boolean> | Ref<boolean> | boolean;
  }

  const props = withDefaults(defineProps<Props>(), {
    show: true,
  });

  const store = inject('documentSheetStore') as DocumentSheetStore;
  const {
    isEditable,
    intellisense: { nameFormulaIntellisenseSchema },
    documentActions: { updateDocument },
  } = store;

  /**
   * Build the encoded context type map for saving with the formula.
   * Maps context names → compound keys like "Item.weapon".
   */
  const encodedContexts = computed((): Record<string, string> => {
    const contexts: Record<string, string> = {};
    const doc = store._storeUtils.document.value;
    const documentType = (doc as any).documentName;
    const subtype = doc.type;

    // Self — the document being edited
    if (documentType && subtype && hasIntellisenseSchema(documentType, subtype)) {
      contexts.self = encodeContextType(documentType, subtype);
    }

    // Owner — always present; uses the parent actor's type or defaults to 'character'
    const actor = (doc as any).actor;
    const actorType = actor?.type ?? 'character';
    if (hasIntellisenseSchema('Actor', actorType)) {
      contexts.owner = encodeContextType('Actor', actorType);
    }

    return contexts;
  });

  /**
   * Save the formula as FormulaFieldData (formula + contexts).
   * Uses updateDocument to trigger name re-evaluation.
   */
  const onUpdate = (formula: string) => {
    const formulaData: FormulaFieldData | null = formula.trim()
      ? { formula, contexts: encodedContexts.value }
      : null;
    return updateDocument({ [props.fieldPath]: formulaData } as any);
  };

  const show = computed(() => {
    if (typeof props.show === 'boolean') return props.show;
    return (props.show as any).value;
  });

  const displayValueUnwrapped = computed(() => {
    let val = props.displayValue;
    if (typeof val === 'object' && val !== null && 'value' in val) {
      val = (val as any).value;
    }
    if (val === undefined || val === null || val === '') return '—';
    return String(val);
  });

  const editValueUnwrapped = computed(() => {
    let val = props.editValue;
    if (typeof val === 'object' && val !== null && 'value' in val) {
      val = (val as any).value;
    }
    if (val === undefined || val === null) return '';
    return String(val);
  });
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
