<template>
  <FamiliarOverlayInput
    ref="overlayRef"
    :model-value="displayValue"
    :disabled="isInputDisabled"
    :placeholder="props.placeholder"
    :name="props.name"
    input-class="aspect-picker-input"
    highlight-class="highlight-layer"
    wrapper-class="aspect-picker-wrapper"
    edit-container-class="aspect-picker-edit-container"
    hint-class="aspect-picker-hint"
    :input-state-classes="{
      'has-error': validationErrors.length > 0,
      'is-disabled': isInputDisabled,
      'no-context': !hasContext,
    }"
    :highlight-state-classes="{ 'no-context': !hasContext }"
    :highlighted-html="highlightedHTML"
    :show-familiar="showFamiliar"
    :familiar-options="familiarOptions"
    :familiar-index="familiarIndex"
    :familiar-position="familiarPosition"
    :hint="displayHint"
    @input="onInput"
    @blur="onBlur"
    @keydown="onKeyDown"
    @focus="onFocus"
    @scroll="syncScroll"
    @select="onFamiliarSelect"
  >
    <!--
      Advanced editor button: the inline input strips spaces/commas (single-aspect
      editing only), so composing a `$conditional(when()else())` key can only happen
      in the multiline modal — same affordance as `FormulaFormGroup`.
    -->
    <template v-if="!props.disabled && !props.hideAdvancedEditor" #decoration>
      <button
        type="button"
        class="field-control-btn"
        :aria-label="advancedEditorLabel"
        :title="advancedEditorLabel"
        @click="isModalOpen = true"
      >
        <i class="fas fa-expand-arrows-alt" />
      </button>
    </template>
  </FamiliarOverlayInput>

  <FormulaMultilineModal
    v-if="!props.hideAdvancedEditor"
    :open="isModalOpen"
    :formula="modalFormula"
    :contexts="wrappedSchema"
    :label="props.label"
    :placeholder="props.placeholder"
    :on-commit="commitFormula"
    @close="isModalOpen = false"
  />
</template>

<script setup lang="ts">
  import { FormulaResolver } from '@helpers/formulae/FormulaResolver.mjs';
  import type { AutocompleteOption, FamiliarSchema, ValidationError } from '@helpers/formulae/types.mjs';
  import { useFamiliarOverlayInput } from '@helpers/formulae/useFamiliarOverlayInput.mjs';
  import { canonicalizeFormula, localizeFormula, renderFormulaHTML, resolveFamiliarLeafToAccessPath } from '@helpers/formulae/utils.mjs';

  const { findAspectByAccessPath, parseFormula, validateFormula } = FormulaResolver;
  import FormulaMultilineModal from '@helpers/formulae/FormulaMultilineModal.vue';
  import FamiliarOverlayInput from '@vc/fields/formGroups/FamiliarOverlayInput.vue';
  import { computed, nextTick, onUnmounted, type PropType, ref, watch } from 'vue';

  // Template renders two root nodes (`FamiliarOverlayInput` + `FormulaMultilineModal`),
  // same as `FormulaFormGroup` — see its own note on why `$attrs` fallthrough needs help.
  defineOptions({ inheritAttrs: false });

  const props = defineProps({
    /** Stored raw document path (e.g. 'system.hardness.value'), or a `$conditional(...)` formula (canonical form) */
    modelValue: { type: String, default: '' },
    /** Whether the picker is disabled (read-only display of familiar syntax) */
    disabled: { type: Boolean, default: false },
    /**
     * Named familiar contexts for autocomplete (e.g. `{ weapon: itemCtx, character: actorCtx }`).
     * Multiple contexts may be offered at once - the user picks which one via the `#name.`
     * prefix, same as `FormulaFormGroup`'s Value/Condition editors. Empty/undefined = degrade
     * to plain text.
     */
    contexts: { type: Object as PropType<FamiliarSchema>, default: undefined },
    /** Placeholder text for empty input */
    placeholder: { type: String, default: 'Select property...' },
    /** Form field name attribute */
    name: { type: String, default: undefined },
    /** Label shown in the advanced editor modal's title bar. */
    label: { type: String, default: undefined },
    /**
     * Suppress the auto-generated "Available Contexts: [...]" hint text.
     * Used when a consumer renders that hint itself once, shared across
     * several sibling fields (e.g. the AE Changes table's row-context line).
     * Validation errors still surface via `update:error` regardless.
     */
    hideContextHint: { type: Boolean, default: false },
    /** Suppress the advanced editor button/modal (e.g. compact contexts with no room for it). */
    hideAdvancedEditor: { type: Boolean, default: false },
  });

  const emit = defineEmits<{
    'update:modelValue': [value: string];
    /** Current validation error message for this field, or null when valid. */
    'update:error': [error: string | null];
  }>();

  const familiarVerticalGap = 2;

  const overlayRef = ref<InstanceType<typeof FamiliarOverlayInput>>();
  const validationErrors = ref<ValidationError[]>([]);

  // Familiar composable — manages autocomplete state
  const {
    familiarOptions,
    showFamiliar,
    familiarIndex,
    familiarPosition,
    dismissFamiliar,
    handleNavigationKey,
    syncScroll: syncOverlayScroll,
    updateAutocomplete: updateOverlayAutocomplete,
  } = useFamiliarOverlayInput();

  const getInputElement = (): HTMLInputElement | undefined => overlayRef.value?.getInputElement();
  const getHighlightElement = (): HTMLDivElement | undefined => overlayRef.value?.getHighlightElement();
  const getDropdownMenuElement = (): HTMLElement | undefined => overlayRef.value?.getDropdownMenuElement();

  const wrappedSchema = computed((): FamiliarSchema => props.contexts ?? {});
  const hasContext = computed((): boolean => Object.keys(wrappedSchema.value).length > 0);

  /** Whether the stored value is a `$conditional(...)` formula rather than a plain raw accessPath. */
  const isConditionalValue = computed((): boolean => props.modelValue.includes('$conditional('));
  // The inline `<input>` strips spaces/commas on every keystroke (single-aspect editing
  // only, see `onInput`) — a `$conditional(when()else())` block needs both, so once a
  // key is conditional it can only be edited via the advanced editor modal.
  const isInputDisabled = computed((): boolean => props.disabled || isConditionalValue.value);

  const advancedEditorLabel = computed(() => game.i18n.localize('dnd35e.Formula.AdvancedEditor'));

  /**
   * Translate a stored raw accessPath to its canonical `#context.property` form by
   * searching every named context in `props.contexts` for a match. A `$conditional(...)`
   * value is already canonical formula text (see `commitFormula`) and passes through
   * unchanged. e.g. 'system.hardness' → '#weapon.hardness'
   */
  function rawToCanonical(rawPath: string): string {
    if (!rawPath || rawPath.includes('$conditional(')) return rawPath;
    for (const [name, ctx] of Object.entries(wrappedSchema.value)) {
      const result = findAspectByAccessPath(ctx.properties, rawPath);
      if (result) return `#${name}.${result.treePath.join('.')}`;
    }
    // Unresolvable — show raw path as-is
    return rawPath;
  }

  /**
   * Translate a stored raw accessPath (or `$conditional(...)` formula) to familiar
   * display syntax (localized). e.g. 'system.hardness' → '#weapon.Hardness' (English)
   * / '#weapon.Twardość' (Polish).
   */
  function rawToFamiliar(rawPath: string): string {
    if (!rawPath) return rawPath;
    return localizeFormula(rawToCanonical(rawPath), wrappedSchema.value);
  }

  /**
   * Translate familiar display syntax back to raw accessPath.
   * Handles both localized (#Weapon.Twardość) and canonical (#weapon.hardness) input, and
   * determines which named context the picked property belongs to from its own `#name.`
   * prefix rather than a fixed `contextName` prop — this is what lets a single Field/Key
   * picker offer several contexts (e.g. item and actor) at once.
   *
   * Canonicalizes first so localized display names map to canonical tree keys,
   * then walks that context's tree to find the leaf FieldAspect's accessPath. A
   * `$conditional(...)` value is stored as canonical formula text as-is — each
   * embedded `#context.property` reference is resolved separately at apply time
   * (see `resolveActiveEffectChangeKey.mts`), not translated to a raw path here.
   */
  function familiarToRaw(familiarPath: string): string {
    if (!hasContext.value) return familiarPath;

    // Canonicalize: e.g. '#Weapon.Twardość' → '#weapon.hardness'
    const canonical = canonicalizeFormula(familiarPath, wrappedSchema.value);
    if (canonical.includes('$conditional(')) return canonical;

    return resolveFamiliarLeafToAccessPath(canonical, wrappedSchema.value) ?? familiarPath;
  }

  // The display value shown in the input
  const displayValue = ref(rawToFamiliar(props.modelValue));

  // The advanced editor modal expects canonical (unlocalized) formula text — it
  // localizes internally, same as the inline field.
  const modalFormula = computed((): string => rawToCanonical(props.modelValue));

  const isModalOpen = ref(false);

  /** Commit handler for the advanced editor modal (always receives canonical formula text). */
  function commitFormula(canonical: string): void {
    const rawPath = canonical.includes('$conditional(')
      ? canonical
      : resolveFamiliarLeafToAccessPath(canonical, wrappedSchema.value) ?? canonical;
    emit('update:modelValue', rawPath);
    displayValue.value = rawToFamiliar(rawPath);
    updateValidation();
    nextTick(syncScroll);
  }

  const highlightedHTML = computed(() => {
    const value = displayValue.value;
    if (!value) return '';
    if (!hasContext.value) return escapeHTML(value);
    const tokens = parseFormula(value);
    return renderFormulaHTML(value, tokens, validationErrors.value, wrappedSchema.value);
  });

  const dynamicHint = computed(() => {
    if (props.hideContextHint) return '';
    if (!hasContext.value) return '';
    const names = Object.entries(wrappedSchema.value).map(([name, ctx]) =>
      ctx.display ?? (name.charAt(0).toUpperCase() + name.slice(1))
    );
    return `Available Contexts: [${names.join(', ')}]`;
  });

  // Any error-severity validation issue (unresolvable context/property, etc.) —
  // exposed separately so consumers can surface it (e.g. combined into a shared
  // row-context error line) even when the dynamic context hint itself is
  // suppressed via `hideContextHint`.
  const currentError = computed((): string | null => {
    const keyError = validationErrors.value.find(e => e.severity === 'error');
    return keyError?.error ?? null;
  });

  const displayHint = computed(() => {
    if (props.disabled) return '';
    // Suppressed when the context hint is hidden — the consumer (e.g. the AE
    // Changes table row) is already showing this error via the `update:error`
    // emit in a shared line.
    if (currentError.value && !props.hideContextHint) return currentError.value;
    return dynamicHint.value;
  });

  watch(currentError, (error) => emit('update:error', error), { immediate: true });

  // Track whether user is actively editing
  let isUserEditing = false;

  function escapeHTML(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll('\'', '&#39;');
  }

  function updateValidation() {
    if (!hasContext.value || !displayValue.value) {
      validationErrors.value = [];
      return;
    }

    const errors = validateFormula(displayValue.value, wrappedSchema.value);

    // A stored raw path (not '#context.property' syntax) that can't be resolved in ANY of
    // the current contexts isn't caught by validateFormula's token-based extraction (no '#'
    // tokens to inspect). Surface it as an explicit error instead of silently leaving the
    // field looking valid. Doesn't apply to `$conditional(...)` values — those ARE stored
    // as '#context.property' formula text, already covered by `validateFormula` above.
    if (
      errors.length === 0
      && props.modelValue
      && !isConditionalValue.value
      && !Object.values(wrappedSchema.value).some(ctx => findAspectByAccessPath(ctx.properties, props.modelValue))
    ) {
      errors.push({
        variable: props.modelValue,
        context: '',
        path: [],
        error: game.i18n.format('dnd35e.Formula.Errors.propertyNotFound', { key: props.modelValue, path: Object.keys(wrappedSchema.value).join(', ') }),
        severity: 'error',
        index: 0,
      });
    }

    validationErrors.value = errors;
  }

  function syncScroll() {
    syncOverlayScroll(getInputElement(), getHighlightElement());
  }

  // Sync external modelValue changes into display (but not during active editing)
  watch(() => props.modelValue, (newRaw) => {
    if (!isUserEditing) {
      displayValue.value = rawToFamiliar(newRaw);
      updateValidation();
      nextTick(syncScroll);
    }
  });

  // Re-translate when the available contexts change
  watch(() => props.contexts, () => {
    if (!isUserEditing) {
      displayValue.value = rawToFamiliar(props.modelValue);
      updateValidation();
      nextTick(syncScroll);
    }
  });

  function onFocus() {
    isUserEditing = true;
  }

  function onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    // Strip spaces, commas, and other delimiters — single aspect only
    const value = target.value.replace(/[\s,;]/g, '');
    displayValue.value = value;
    updateValidation();
    nextTick(syncScroll);

    if (!hasContext.value || !value) {
      dismissFamiliar();
      return;
    }

    // Trigger autocomplete on every keystroke — auto-prefix with # if not present
    const searchText = value.startsWith('#') ? value : `#${value}`;
    updateAutocompleteMenu(searchText);
  }

  function onBlur() {
    setTimeout(() => {
      dismissFamiliar();
      if (isUserEditing) {
        isUserEditing = false;
        commitValue();
      }
      updateValidation();
    }, 200);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (handleNavigationKey(event, selectOption, getDropdownMenuElement())) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      isUserEditing = false;
      commitValue();
      getInputElement()?.blur();
      return;
    }

    if (event.key === 'Escape') {
      // Revert to stored value
      displayValue.value = rawToFamiliar(props.modelValue);
      isUserEditing = false;
      dismissFamiliar();
      updateValidation();
      getInputElement()?.blur();
      event.preventDefault();
    }
  }

  async function updateAutocompleteMenu(text: string) {
    const inputEl = getInputElement();
    if (!inputEl) return;

    const lastDotIndex = text.lastIndexOf('.');
    const anchorCharIndex = lastDotIndex !== -1 ? lastDotIndex + 1 : 0;
    const displayOffset = displayValue.value.startsWith('#') ? anchorCharIndex : Math.max(0, anchorCharIndex - 1);

    await updateOverlayAutocomplete({
      text,
      context: wrappedSchema.value,
      inputEl,
      wrapperEl: inputEl.closest('.aspect-picker-wrapper') as HTMLElement | null,
      anchorIndex: displayOffset,
      verticalGap: familiarVerticalGap,
      dropdownEl: getDropdownMenuElement(),
    });
  }

  function selectOption(option: AutocompleteOption) {
    // Display the familiar path
    displayValue.value = option.fullPath;

    if (option.isLeaf) {
      // Commit the raw accessPath
      const rawPath = option.accessPath ?? familiarToRaw(option.fullPath);
      emit('update:modelValue', rawPath);
      dismissFamiliar();
      isUserEditing = false;
      updateValidation();
    } else {
      // Branch selected — show next level
      nextTick(() => {
        const searchText = option.fullPath.startsWith('#') ? option.fullPath : `#${option.fullPath}`;
        updateAutocompleteMenu(searchText);
        getInputElement()?.focus();
      });
    }
  }

  function onFamiliarSelect(option: AutocompleteOption) {
    selectOption(option);
  }

  /**
   * Commit the current display value.
   * If it's valid familiar syntax, translate to raw accessPath.
   * Otherwise, emit as-is (user typed a manual raw path).
   */
  function commitValue() {
    const current = displayValue.value;
    if (!current) {
      emit('update:modelValue', '');
      return;
    }

    const rawPath = familiarToRaw(current);
    emit('update:modelValue', rawPath);
    // Normalize display after commit
    displayValue.value = rawToFamiliar(rawPath);
    updateValidation();
    nextTick(syncScroll);
  }

  updateValidation();

  onUnmounted(() => {
    dismissFamiliar();
  });
</script>

<style scoped lang="scss">
  .aspect-picker-wrapper {
    width: 100%;
  }

  .aspect-picker-hint {
    margin: 0.25rem 0 0;
    font-size: var(--font-size-11);
    color: var(--color-text-secondary);
  }

  .aspect-picker-edit-container {
    width: 100%;
  }

  // `.aspect-picker-input` and `.highlight-layer` are rendered inside the child
  // <FamiliarOverlayInput>, so scoped CSS can't reach them without :deep().
  // Without this the input never turns transparent and its opaque text hides
  // the colored highlight overlay (variables appear uncolored).
  :deep(.aspect-picker-input) {
    padding: 0.35rem 0.5rem;
    font-family: 'Courier New', 'Consolas', monospace;
    font-size: 0.85rem;
    line-height: 1.5;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    background: transparent;
    color: transparent;
    caret-color: #66b3ff;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &::placeholder {
      color: rgba(255, 255, 255, 0.25);
      font-style: italic;
    }

    &:focus {
      border-color: rgba(102, 166, 255, 0.5);
      box-shadow: 0 0 0 2px rgba(102, 166, 255, 0.1);
    }

    &.has-error {
      border-color: rgba(255, 100, 100, 0.45);
      box-shadow: 0 0 0 1px rgba(255, 100, 100, 0.15);
    }

    &.is-disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }

  :deep(.highlight-layer) {
    padding: 0.35rem 0.5rem;
    font-family: 'Courier New', 'Consolas', monospace;
    font-size: 0.85rem;
    line-height: 1.5;
    color: #d4d4d4;

    &.no-context {
      color: #d4d4d4;
    }
  }
</style>
