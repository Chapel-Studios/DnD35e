<template>
  <div class="formula-settings-group">
    <label v-if="props.label" class="formula-settings-label" :for="props.id">
      {{ localize(props.label) }}
    </label>
    <p v-if="displayHint" class="formula-settings-hint">
      {{ displayHint }}
    </p>

    <FamiliarOverlayInput
      ref="overlayRef"
      v-bind="overlayInputModel"
      v-on="overlayInputHandlers"
    />
    <p v-if="contextHint" class="formula-settings-context-hint">
      {{ contextHint }}
    </p>
  </div>
</template>

<script setup lang="ts">
  import { buildMergedFamiliarContext } from '@helpers/formulae/registry.mjs';
  import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
  import { useFormulaEditor } from '@helpers/formulae/useFormulaEditor.mjs';
  import FamiliarOverlayInput from '@vc/fields/formGroups/FamiliarOverlayInput.vue';
  import { computed, type PropType, ref } from 'vue';

  const props = defineProps({
    id: { type: String, required: true },
    label: { type: String, default: '' },
    hint: { type: String, default: '' },
    value: { type: String, default: '' },
    onUpdate: { type: Function as PropType<(value: string) => void>, default: undefined },
    disabled: { type: Boolean, default: false },
    placeholder: { type: String, default: '' },
    contexts: { type: Object as PropType<FamiliarSchema>, default: undefined },
  });

  const localize = (key: string): string => game.i18n.localize(key);

  const defaultActorContext = buildMergedFamiliarContext('Actor', ['character']);
  const contexts = computed(() => props.contexts ?? (defaultActorContext ? { self: { ...defaultActorContext, display: localize('dnd35e.Formula.Context.Self') } } : {}));

  const overlayRef = ref<InstanceType<typeof FamiliarOverlayInput>>();
  const getInputElement = (): HTMLInputElement | undefined => overlayRef.value?.getInputElement();
  const getHighlightElement = (): HTMLDivElement | undefined => overlayRef.value?.getHighlightElement();
  const getDropdownMenuElement = (): HTMLElement | undefined => overlayRef.value?.getDropdownMenuElement();

  const currentValue = computed(() => props.value || '');

  const displayHint = computed(() => props.hint ? localize(props.hint) : '');

  const contextHint = computed(() => {
    const keys = Object.keys(contexts.value);
    if (!keys.length) return '';
    const names = Object.entries(contexts.value).map(([key, ctx]) => ctx.display ?? (key.charAt(0).toUpperCase() + key.slice(1)));
    const localizedPrefix = game.i18n.localize('dnd35e.Formula.availableContexts');
    return `${localizedPrefix}: [${names.join(', ')}]`;
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
    currentValue,
    getInputElement,
    getHighlightElement,
    getDropdownMenuElement,
    onCommit: (canonical) => {
      if (typeof props.onUpdate === 'function') {
        props.onUpdate(canonical);
      }
    },
  });

  const overlayInputModel = computed(() => ({
    id: props.id,
    name: props.id,
    modelValue: localValue.value,
    disabled: props.disabled,
    placeholder: props.placeholder ?? localize('dnd35e.SETTINGS.DeathThreshold.Formula.Placeholder'),
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
</script>

<style scoped lang="scss">
  .formula-settings-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .formula-settings-label {
    font-weight: 600;
  }

  .formula-settings-hint {
    margin: 0;
    color: var(--color-text-light-5, #8f8f8f);
    font-size: 0.9em;
  }

  .formula-settings-context-hint {
    margin: 0;
    color: var(--color-text-light-4, #9f9f9f);
    font-size: 0.85em;
    font-style: italic;
  }
</style>