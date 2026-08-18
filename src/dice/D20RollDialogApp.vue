<template>
  <form class="d20-roll-dialog" @submit.prevent="onRoll">
    <div class="title-row full">
      <img :src="context.data.actorImage" alt="" class="actor-image" />
      <div class="title-text">
        <h3 class="value">{{ context.data.actorName}} -</h3>
        <br />
        <h4 class="label">{{ context.data.title }}</h4>
      </div>
    </div>
    <div class="base-row subgrid">
      <span class="label">{{ context.data.baseLabel }}</span>
      <span class="value">{{ formatBonus(context.data.baseTotal) }}</span>
    </div>

    <div class="form-group subgrid">
      <label for="situational-modifier">{{ localize('dnd35e.ROLL.SituationalModifier') }}</label>
      <FamiliarOverlayInput
        ref="overlayRef"
        v-bind="overlayInputModel"
        v-on="overlayInputHandlers"
      />
    </div>

    <div class="total-row subgrid">
      <span class="label">{{ localize('dnd35e.ROLL.Total') }}</span>
      <span class="value">{{ formatBonus(total) }}</span>
    </div>

    <footer class="form-footer full">
      <div class="form-group roll-mode">
        <label for="roll-mode">{{ localize('dnd35e.COMMON.RollMode') }}</label>
        <select id="roll-mode" v-model="context.data.rollMode">
          <option v-for="mode in rollModes" :key="mode.value" :value="mode.value">
            {{ localize(mode.label) }}
          </option>
        </select>
      </div>
      <div class="form-controls">
        <button type="button" class="cancel-btn" @click="context.cancel()">
          {{ localize('Cancel') }}
        </button>
        <button type="submit" class="roll-btn">
          <i class="fas fa-dice-d20" />
          {{ localize('dnd35e.ROLL.RollButton') }}
        </button>
      </div>
    </footer>
  </form>
</template>

<script setup lang="ts">
  import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
  import { buildDocumentFamiliar } from '@helpers/formulae/registry.mjs';
  import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
  import { useFormulaEditor } from '@helpers/formulae/useFormulaEditor.mjs';
  import { buildDocumentDataMap } from '@helpers/formulae/utils.mjs';
  import FamiliarOverlayInput from '@vc/fields/formGroups/FamiliarOverlayInput.vue';
  import type { VueDialogContext } from '@vueApps/VueDialogMixin.mjs';
  import { computed, ref } from 'vue';

  import type { D20RollDialogData, D20RollDialogResult } from './D20RollDialogConfig.mjs';

  const props = defineProps<{
    context: VueDialogContext<D20RollDialogData, D20RollDialogResult>;
  }>();

  const rollModes = Object.entries(CONFIG.ChatMessage.modes).map(([value, mode]) => ({ value, label: mode.label }));

  /** `#self`-only FormulaFamiliar context — a save/initiative roll has no `#target`/`#item`. */
  const contexts = computed<FamiliarSchema>(() => buildDocumentFamiliar(props.context.data.actor));

  const overlayRef = ref<InstanceType<typeof FamiliarOverlayInput>>();
  const getInputElement = (): HTMLInputElement | undefined => overlayRef.value?.getInputElement();
  const getHighlightElement = (): HTMLDivElement | undefined => overlayRef.value?.getHighlightElement();
  const getDropdownMenuElement = (): HTMLElement | undefined => overlayRef.value?.getDropdownMenuElement();

  const currentValue = computed(() => props.context.data.situationalModifier || '');

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
      props.context.data.situationalModifier = canonical;
    },
  });

  /** Resolves a situational-modifier formula against `#self` to a plain number (0 on empty/failure). */
  function resolveSituationalModifier(formula: string): number {
    if (!formula) return 0;
    const resolved = FormulaData.resolveSource(
      FormulaData.toSource(formula, { expectedType: 'number' }),
      buildDocumentDataMap(props.context.data.actor),
      '0'
    );
    const num = resolved !== null ? Number(resolved) : 0;
    return Number.isNaN(num) ? 0 : num;
  }

  const total = computed(() => props.context.data.baseTotal + resolveSituationalModifier(localValue.value));

  const overlayInputModel = computed(() => ({
    id: 'situational-modifier',
    name: 'situational-modifier',
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

  function formatBonus(n: number): string {
    return n >= 0 ? `+${n}` : `${n}`;
  }

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  function onRoll(): void {
    onBlur(); // force-commit any in-progress formula edit before resolving
    props.context.resolve({
      situationalModifier: resolveSituationalModifier(props.context.data.situationalModifier),
      rollMode: props.context.data.rollMode,
    });
  }
</script>

<style scoped lang="scss">
  .d20-roll-dialog {
    display: grid;
    grid-template-columns: minmax(min-content, 3fr) 2fr;
    gap: 0.75rem;
    padding: 0.5rem;

    & > * {
      padding: 0 0.75rem;
    }
    
    .subgrid {
      display: grid;
      grid-template-columns: subgrid;
      grid-column: span 2;
      align-items: center;
    }
    
    .full {
      grid-column: span 2;
    }
  }

  .base-row, .total-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;

    .label {
      font-weight: 500;
    }
  }

  .title-row {
    display: flex;

    .actor-image {
      max-width: 3.25rem;
    }

    h3, h4 {
      margin: 0;
      display: inline;
    }
  }

  .total-row {
    font-size: 1.2rem;
    font-weight: 700;
    border-top: 1px solid var(--color-border);
    padding-top: 0.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    label {
      font-weight: 500;
      font-size: 0.9rem;
    }
  }

  .form-controls {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .roll-mode {
    display: grid;
    grid-template-columns: minmax(max-content, 1fr) 2fr;
    align-items: center;
    gap: 1.5rem;
  }

  .form-footer {
    display: grid;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);

    button {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem 1rem;
      border-radius: 3px;
      cursor: pointer;
      border: 1px solid var(--color-border);
    }
  }
</style>
