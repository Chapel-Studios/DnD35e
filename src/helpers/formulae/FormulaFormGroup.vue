<template>
  <FormGroup
    :label="props.label"
    :hint="displayHint"
    :field-path="props.fieldPath"
    :default-visibility="props.defaultVisibility"
    :default-editability="props.defaultEditability"
    :hide-field-controls="props.hideFieldControls"
    :hide-label="props.hideLabel"
  >
    <template #readonly>
      <slot v-if="slots.readonly" name="readonly" />
      <div v-else class="formula-display">
        <span v-if="!readonlyDisplayHtml" class="formula-result">—</span>
        <span v-else class="formula-result" v-html="readonlyDisplayHtml" />
      </div>
    </template>
    <div class="formula-form-group">
      <FamiliarOverlayInput
        ref="overlayRef"
        :model-value="localValue"
        :disabled="!isEditable"
        placeholder="Enter name or formula (e.g. #self.name)"
        input-class="formula-input"
        highlight-class="highlight-layer"
        input-wrapper-class="formula-input-wrapper"
        edit-container-class="formula-edit-container"
        :input-state-classes="{ 'has-error': formulaErrors.length > 0 }"
        :highlighted-html="highlightedHTML"
        :show-familiar="showFamiliar"
        :familiar-options="familiarOptions"
        :familiar-index="familiarIndex"
        :familiar-position="familiarPosition"
        @input="onInput"
        @blur="onBlur"
        @keydown="onKeyDown"
        @focus="onFocus"
        @scroll="syncScroll"
        @select="onFamiliarSelect"
      />
    </div>
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@documents/document/sheet/DocumentSheetStore.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/sheet/DocumentSheetStore.mjs';
  import type { RenderModeStore } from '@documents/document/sheet/stores/RenderModeStore.mjs';
  import { RenderModeStoreSymbol } from '@documents/document/sheet/stores/RenderModeStore.mjs';
  import FamiliarOverlayInput from '@vc/fields/formGroups/FamiliarOverlayInput.vue';
  import FormGroup from '@vc/fields/formGroups/FormGroup.vue';
  import type { PropType } from 'vue';
  import { computed, inject, ref, useSlots } from 'vue';

  import type { FormulaData } from './FormulaData.mjs';
  import { FormulaField } from './FormulaField.mjs';
  import type { FamiliarSchema } from './types.mts';
  import { useFormulaEditor } from './useFormulaEditor.mjs';
  import {
    filterExcludedFields,
    renderFormulaDisplayHTML,
  } from './utils.mjs';

  const slots = useSlots();

  // Use runtime props definition for better compatibility
  const props = defineProps({
    label: { type: String, default: undefined },
    hint: { type: String, default: undefined },
    isDmOnly: { type: Boolean, default: false },
    /** Formula string (legacy). When formulaData is provided, this is ignored. */
    value: { type: String, default: '' },
    onUpdate: { type: Function as PropType<(value: string) => void>, default: undefined },
    disabled: { type: Boolean, default: false },
    /** Explicit familiar contexts. When omitted, auto-derived from the store's document. */
    contexts: { type: Object as PropType<FamiliarSchema>, default: undefined },
    fieldPath: { type: String, required: true },
    defaultVisibility: { type: String as PropType<'everyone' | 'ownerPlus' | 'gmOnly'>, default: undefined },
    defaultEditability: { type: String as PropType<'normal' | 'gmOnly'>, default: undefined },
    hideFieldControls: { type: Boolean, default: false },
    hideLabel: { type: Boolean, default: false },
    /** FormulaData instance for formula/unidentified formula access. */
    formulaData: { type: Object as PropType<FormulaData | null>, default: undefined },
    /** Whether to focus the input on mount. Used by the name field to focus on edit. */
    focusOnMount: { type: Boolean, default: false },
  });
  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;

  // Effective formula — from FormulaData, or legacy value prop
  const effectiveFormula = computed(() => {
    if (props.formulaData) {
      return props.formulaData.formula || '';
    }
    return props.value || '';
  });

  // Resolve the FormulaField schema entry for this field path to read excludedFields
  const formulaField = computed((): FormulaField | undefined => {
    return sheetStore?._storeUtils?.getSchemaField?.(props.fieldPath) as FormulaField | undefined;
  });

  // If no explicit updater is provided, infer write path from fieldPath:
  // - FormulaField path (e.g. system.nameFormula) => write to .formula leaf
  // - Leaf formula path (e.g. system.changes.0.value) => write directly
  const inferredUpdatePath = computed((): string => {
    if (props.fieldPath.endsWith('.formula')) return props.fieldPath;
    const schemaField = sheetStore?._storeUtils?.getSchemaField?.(props.fieldPath);
    if (schemaField instanceof FormulaField) {
      return `${props.fieldPath}.formula`;
    }
    return props.fieldPath;
  });

  const inferredUpdater = computed<((value: string) => Promise<boolean>) | undefined>(() => {
    return sheetStore?.documentActions?.getViewAwareFieldUpdater?.(inferredUpdatePath.value) as
      | ((value: string) => Promise<boolean>)
      | undefined;
  });

  // Effective contexts — explicit prop > store schema > FormulaData bindings > empty
  // Then filter out excludedFields declared on the FormulaField.
  const contexts = computed((): FamiliarSchema => {
    let schema: FamiliarSchema = {};
    if (props.contexts) {
      const raw = props.contexts;
      if (typeof raw === 'object' && '__v_isRef' in raw) {
        schema = (raw as any).value ?? {};
      } else {
        schema = raw;
      }
    } else if (sheetStore?.documentGetters?.familiarSchema?.value) {
      const storeSchema = sheetStore.documentGetters.familiarSchema.value;
      if (Object.keys(storeSchema).length > 0) schema = storeSchema;
    }

    const excluded = formulaField.value?.excludedFields ?? [];
    return filterExcludedFields(schema, excluded);
  });

  // Refs
  const overlayRef = ref<InstanceType<typeof FamiliarOverlayInput>>();

  const getInputElement = (): HTMLInputElement | undefined => overlayRef.value?.getInputElement();
  const getHighlightElement = (): HTMLDivElement | undefined => overlayRef.value?.getHighlightElement();
  const getDropdownMenuElement = (): HTMLElement | undefined => overlayRef.value?.getDropdownMenuElement();

  // Read isEditable from the store, with disabled prop as override
  const sheetStore = inject(DocumentSheetStoreSymbol, null) as DocumentSheetStore | null;
  const isEditable = computed(() => {
    if (props.disabled) return false;
    return isEditMode.value;
  });

  /** Auto-generate hint from context keys, e.g. "Available Contexts: [Self, Owner]" */
  const dynamicHint = computed(() => {
    if (props.hint) return props.hint;
    const keys = Object.keys(contexts.value);
    if (keys.length === 0) return '';
    const names = Object.entries(contexts.value).map(([k, ctx]) => ctx.display ?? (k.charAt(0).toUpperCase() + k.slice(1)));
    const localizedPrefix = game.i18n.localize('dnd35e.Formula.availableContexts');
    return `${localizedPrefix}: [${names.join(', ')}]`;
  });

  const displayHint = computed(() => isEditMode.value ? dynamicHint.value : (props.hint ?? ''));

  const readonlyDisplayHtml = computed(() => {
    if (!effectiveFormula.value) {
      return props.formulaData?.resolvedValue ?? props.value ?? '';
    }
    return renderFormulaDisplayHTML(effectiveFormula.value, contexts.value);
  });

  const {
    familiarOptions,
    showFamiliar,
    familiarIndex,
    familiarPosition,
    localValue,
    formulaErrors,
    highlightedHTML,
    syncScroll,
    onInput,
    onBlur,
    onKeyDown,
    onFocus,
    onFamiliarSelect,
  } = useFormulaEditor({
    contexts,
    currentValue: effectiveFormula,
    getInputElement,
    getHighlightElement,
    getDropdownMenuElement,
    onCommit: (canonical) => {
      if (typeof props.onUpdate === 'function') {
        props.onUpdate(canonical);
        return;
      }

      if (typeof inferredUpdater.value === 'function') {
        void inferredUpdater.value(canonical || '');
        return;
      }

      console.warn(`[FormulaFormGroup] No updater available for ${props.fieldPath}. Provide onUpdate or ensure DocumentSheetStore is injected.`);
    },
    focusOnMount: () => isEditable.value && props.focusOnMount,
  });
</script>

<style scoped lang="scss">
// Readonly slot content (sibling of .formula-form-group)
.formula-display {
  padding: 0.65rem;
  min-height: 2.5rem;
  border: 1px solid transparent;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  font-family: 'Courier New', 'Consolas', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #d4d4d4;
  user-select: none;
  word-break: break-word;
  white-space: pre-wrap;
}

// NOTE: `.formula-input` and `.highlight-layer` styling lives in the GLOBAL
// stylesheet (src/styles/core.scss), NOT here. Those elements are rendered
// inside the child <FamiliarOverlayInput> component, so Vue scoped CSS cannot
// reach them from this parent. The class names are also intentionally shared
// with FormulaSettingsGroup, so a single global source of truth keeps every
// formula editor's transparent-input + colored-overlay treatment consistent.

</style>
