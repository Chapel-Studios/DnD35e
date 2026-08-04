<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="formula-modal-backdrop"
      @click.self="close"
      @keydown.esc="close"
    >
      <div class="formula-modal" role="dialog" aria-modal="true" :aria-label="modalLabel">
        <header class="formula-modal-header">
          <h3 class="formula-modal-title">{{ modalLabel }}</h3>
          <button
            type="button"
            class="field-control-btn formula-modal-close"
            :aria-label="closeLabel"
            @click="close"
          >
            <i class="fas fa-times" />
          </button>
        </header>

        <div class="formula-modal-body">
          <div class="familiar-overlay-edit-container formula-modal-edit-container">
            <FamiliarOverlayTextarea
              ref="overlayRef"
              :model-value="localValue"
              :placeholder="resolvedPlaceholder"
              input-class="formula-input formula-input-multiline"
              highlight-class="highlight-layer highlight-layer-multiline"
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
          <p v-if="hintText" class="familiar-overlay-hint">{{ hintText }}</p>
        </div>

        <footer class="formula-modal-footer">
          <button type="button" class="formula-modal-done" @click="close">{{ doneLabel }}</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
  import FamiliarOverlayTextarea from '@vc/fields/formGroups/FamiliarOverlayTextarea.vue';
  import type { PropType } from 'vue';
  import { computed, nextTick, ref, watch } from 'vue';

  import type { FamiliarSchema } from './types.mjs';
  import { useFormulaEditor } from './useFormulaEditor.mjs';

  /**
   * Advanced multiline formula editor modal (poc §7.10 Story C, Half 2). Same
   * validation/highlighting/autocomplete engine as the inline `FormulaFormGroup`
   * field (via `useFormulaEditor({ multiline: true })`), but real line breaks are
   * allowed and preserved. `Enter` inserts a newline; commit happens on
   * blur/close (Done button, backdrop click, or Escape).
   */
  const props = defineProps({
    open: { type: Boolean, required: true },
    formula: { type: String, default: '' },
    contexts: { type: Object as PropType<FamiliarSchema>, default: () => ({}) },
    expectedType: { type: String as PropType<'string' | 'number' | 'boolean'>, default: undefined },
    label: { type: String, default: undefined },
    placeholder: { type: String, default: undefined },
    onCommit: { type: Function as PropType<(value: string) => void>, required: true },
  });

  const emit = defineEmits<{
    close: [];
  }>();

  const modalLabel = computed(() => props.label || game.i18n.localize('dnd35e.Formula.AdvancedEditorTitle'));
  const closeLabel = computed(() => game.i18n.localize('dnd35e.Formula.Close'));
  const doneLabel = computed(() => game.i18n.localize('dnd35e.Formula.Done'));
  const resolvedPlaceholder = computed(() => props.placeholder ?? game.i18n.localize('dnd35e.Formula.DefaultPlaceholder'));

  const contextsRef = computed(() => props.contexts);
  const currentValue = computed(() => props.formula || '');
  const expectedTypeRef = computed(() => props.expectedType);

  const overlayRef = ref<InstanceType<typeof FamiliarOverlayTextarea>>();

  const getInputElement = () => overlayRef.value?.getInputElement();
  const getHighlightElement = () => overlayRef.value?.getHighlightElement();
  const getDropdownMenuElement = () => overlayRef.value?.getDropdownMenuElement();

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
    commitNow,
  } = useFormulaEditor({
    contexts: contextsRef,
    currentValue,
    getInputElement,
    getHighlightElement,
    getDropdownMenuElement,
    onCommit: props.onCommit,
    expectedType: expectedTypeRef,
    multiline: true,
  });

  /** Auto-generate hint from context keys, e.g. "Available Contexts: [Self, Owner]" — same logic as FormulaFormGroup's dynamicHint. */
  const dynamicHint = computed(() => {
    const schema = props.contexts ?? {};
    const keys = Object.keys(schema);
    if (keys.length === 0) return '';
    const names = Object.entries(schema).map(([k, ctx]) => ctx.display ?? (k.charAt(0).toUpperCase() + k.slice(1)));
    const localizedPrefix = game.i18n.localize('dnd35e.Formula.availableContexts');
    return `${localizedPrefix}: [${names.join(', ')}]`;
  });

  const hintText = computed(() => {
    const typeError = formulaErrors.value.find(e => e.context === '' && e.severity === 'error');
    if (typeError?.error) return typeError.error;
    return dynamicHint.value;
  });

  const close = () => {
    // Explicit commit before emitting close — the textarea's own blur may not
    // have fired yet (e.g. closing via the backdrop/Escape without ever
    // blurring the field), so this guarantees a pending edit isn't dropped.
    commitNow();
    emit('close');
  };

  watch(() => props.open, (isOpen) => {
    if (isOpen) {
      void nextTick(() => getInputElement()?.focus());
    }
  });
</script>

<style scoped lang="scss">
.formula-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
}

.formula-modal {
  display: flex;
  flex-direction: column;
  width: min(640px, 90vw);
  max-height: 80vh;
  background: var(--color-cool-4, #23272d);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.formula-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.formula-modal-title {
  margin: 0;
  font-size: var(--font-size-14, 14px);
}

.formula-modal-body {
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  overflow: auto;
}

.formula-modal-edit-container {
  min-height: 12rem;
}

.formula-modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.formula-modal-done {
  padding: 0.35rem 1rem;
}
</style>
