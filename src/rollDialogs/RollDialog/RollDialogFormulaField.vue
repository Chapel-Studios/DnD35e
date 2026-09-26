<template>
  <div class="form-group roll-dialog-formula-field">
    <label :for="id">{{ localize(label) }}</label>
    <FamiliarOverlayInput
      ref="overlayRef"
      v-bind="overlayInputModel"
      v-on="overlayInputHandlers"
    />
    <p v-if="dynamicHint" class="hint">{{ dynamicHint }}</p>
  </div>
</template>

<script setup lang="ts">
  import { buildDocumentFamiliar } from '@helpers/formulae/registry.mjs';
  import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
  import { useFormulaEditor } from '@helpers/formulae/useFormulaEditor.mjs';
  import FamiliarOverlayInput from '@vc/fields/formGroups/FamiliarOverlayInput.vue';
  import { computed, inject, ref } from 'vue';

  import type { RollDialogStore } from './RollDialogStore.mjs';
  import { RollDialogStoreSymbol } from './RollDialogStore.mjs';

  /**
   * Reusable formula input for the roll dialogs (poc.10 Story D) — situational modifier,
   * damage bonus, etc. Similar in spirit to `FormulaFormGroup` (the sheet-side equivalent),
   * but simpler: no `FormGroup`/field-permission wrapper, and injects the roll dialog store
   * directly for the actor document and `registerPreRollCommit` instead of a
   * `DocumentSheetStore`. Defaults to a `#self`-only FormulaFamiliar context (the actor);
   * callers with richer context needs (e.g. the weapon-attack dialogs' `item`/`thisAttack`/
   * `target`, poc.10 Story D) pass a full replacement schema via the `contexts` prop.
   */
  const props = defineProps<{
    id: string;
    /** Localization key for the field label. */
    label: string;
    /**
     * Full FormulaFamiliar schema override. When provided, replaces the default
     * actor-only `#self` context entirely (the override is expected to already include
     * its own `self`/`actor`-equivalent entry).
     */
    contexts?: FamiliarSchema;
  }>();

  const modelValue = defineModel<string>({ required: true });

  const { actor: { document: actorDocument }, actions } = inject(RollDialogStoreSymbol) as RollDialogStore;

  const defaultContexts = computed<FamiliarSchema>(() => buildDocumentFamiliar(actorDocument.value));
  const contexts = computed<FamiliarSchema>(() => props.contexts ?? defaultContexts.value);

  const overlayRef = ref<InstanceType<typeof FamiliarOverlayInput>>();
  const getInputElement = (): HTMLInputElement | undefined => overlayRef.value?.getInputElement();
  const getHighlightElement = (): HTMLDivElement | undefined => overlayRef.value?.getHighlightElement();
  const getDropdownMenuElement = (): HTMLElement | undefined => overlayRef.value?.getDropdownMenuElement();

  const currentValue = computed(() => modelValue.value || '');

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
    currentValue,
    getInputElement,
    getHighlightElement,
    getDropdownMenuElement,
    onCommit: (canonical) => { modelValue.value = canonical; },
  });

  actions.registerPreRollCommit(onBlur);

  // Mirrors FormulaFormGroup's "Available Contexts: [...]" hint — this field has no
  // FormGroup wrapper to generate it for us.
  const dynamicHint = computed(() => {
    const entries = Object.entries(contexts.value);
    if (entries.length === 0) return '';
    const names = entries.map(([key, ctx]) => ctx.display ?? (key.charAt(0).toUpperCase() + key.slice(1)));
    const prefix = localize('dnd35e.Formula.availableContexts');
    return `${prefix}: [${names.join(', ')}]`;
  });

  const overlayInputModel = computed(() => ({
    id: props.id,
    name: props.id,
    modelValue: localValue.value,
    inputClass: 'formula-input',
    highlightClass: 'highlight-layer',
    inputWrapperClass: 'formula-input-wrapper',
    editContainerClass: 'formula-edit-container',
    inputStateClasses: { 'has-error': formulaErrors.value.length > 0 },
    highlightedHtml: highlightedHTML.value,
    showFamiliar: showFamiliar.value,
    familiarOptions: familiarOptions.value,
    familiarIndex: familiarIndex.value,
    familiarPosition: familiarPosition.value,
  }));

  const overlayInputHandlers = {
    input: onInput,
    blur: onBlur,
    keydown: onKeyDown,
    focus: onFocus,
    scroll: syncScroll,
    select: onFamiliarSelect,
  };

  function localize(key: string): string {
    return game.i18n.localize(key);
  }
</script>

<style scoped lang="scss">
  .form-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    

    label {
      font-weight: 500;
      font-size: 0.9rem;
    }
  }

  .hint {
    grid-column: span 2;
    font-size: var(--font-size-11);
    color: var(--color-text-secondary);
    margin: 0;
  }
</style>
