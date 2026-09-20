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

    <div v-if="context.data.combatModifiers" class="combat-modifiers full">
      <div v-if="attackTypeModifiers.length" class="modifier-group">
        <h4>{{ localize('dnd35e.COMBAT.CombatModifiers.AttackType') }}</h4>
        <label v-for="mod in attackTypeModifiers" :key="mod.id" class="modifier-toggle">
          <input v-model="mod.checked" type="checkbox" />
          {{ mod.label }}
          <i class="fas fa-circle-question" :title="mod.tooltip" />
        </label>
      </div>
      <div v-if="combatStatusModifiers.length" class="modifier-group">
        <h4>{{ localize('dnd35e.COMBAT.CombatModifiers.CombatStatus') }}</h4>
        <label v-for="mod in combatStatusModifiers" :key="mod.id" class="modifier-toggle">
          <input v-model="mod.checked" type="checkbox" />
          {{ mod.label }}
          <i class="fas fa-circle-question" :title="mod.tooltip" />
        </label>
      </div>
    </div>

    <div v-if="context.data.damageBonus !== undefined" class="form-group subgrid">
      <label for="damage-bonus">{{ localize('dnd35e.ROLL.DamageBonus') }}</label>
      <FamiliarOverlayInput
        ref="damageBonusOverlayRef"
        v-bind="damageBonusOverlayInputModel"
        v-on="damageBonusOverlayInputHandlers"
      />
    </div>

    <div v-if="context.data.wieldMode !== undefined" class="form-group subgrid">
      <label>{{ localize('dnd35e.COMBAT.WieldMode.Label') }}</label>
      <MultiOptionToggle :options="wieldModeOptions" :value="context.data.wieldMode" @update="onWieldModeUpdate" />
    </div>

    <div v-if="context.data.hand !== undefined" class="form-group subgrid">
      <label for="hand-select">{{ localize('dnd35e.COMBAT.Hand.Label') }}</label>
      <select id="hand-select" v-model="context.data.hand">
        <option value="main">{{ localize('dnd35e.COMBAT.Hand.Main') }}</option>
        <option value="off">{{ localize('dnd35e.COMBAT.Hand.Off') }}</option>
      </select>
    </div>

    <div v-if="context.data.ammoOptions?.length" class="form-group subgrid">
      <label for="ammo-select">{{ localize('dnd35e.COMBAT.Ammo') }}</label>
      <select id="ammo-select" v-model="context.data.ammo">
        <option v-for="opt in context.data.ammoOptions" :key="opt.itemUuid" :value="opt.itemUuid">
          {{ opt.name }}
        </option>
      </select>
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
  import type { WieldMode } from '@actors/baseActor/ActorDnd35e.mjs';
  import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
  import { buildDocumentFamiliar } from '@helpers/formulae/registry.mjs';
  import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
  import { useFormulaEditor } from '@helpers/formulae/useFormulaEditor.mjs';
  import { buildDocumentDataMap } from '@helpers/formulae/utils.mjs';
  import FamiliarOverlayInput from '@vc/fields/formGroups/FamiliarOverlayInput.vue';
  import type { SelectOption } from '@vc/fields/index.mjs';
  import MultiOptionToggle from '@vc/fields/MultiOptionToggle.vue';
  import type { VueDialogContext } from '@vueApps/VueDialogMixin.mjs';
  import { computed, ref } from 'vue';

  import type { CombatModifierToggle, D20RollDialogData, D20RollDialogResult } from './D20RollDialogConfig.mjs';

  const props = defineProps<{
    context: VueDialogContext<D20RollDialogData, D20RollDialogResult>;
  }>();

  const rollModes = Object.entries(CONFIG.ChatMessage.modes).map(([value, mode]) => ({ value, label: mode.label }));

  const attackTypeModifiers = computed<CombatModifierToggle[]>(
    () => props.context.data.combatModifiers?.filter(mod => mod.group === 'attackType') ?? []
  );
  const combatStatusModifiers = computed<CombatModifierToggle[]>(
    () => props.context.data.combatModifiers?.filter(mod => mod.group === 'combatStatus') ?? []
  );

  const wieldModeOptions: SelectOption<WieldMode>[] = [
    { label: 'dnd35e.COMBAT.WieldMode.primaryHand', value: 'primaryHand' },
    { label: 'dnd35e.COMBAT.WieldMode.offHand', value: 'offHand' },
    { label: 'dnd35e.COMBAT.WieldMode.twoHanded', value: 'twoHanded' },
  ];

  function onWieldModeUpdate(value: WieldMode): void {
    props.context.data.wieldMode = value;
  }

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

  // ---------------------------------------------------------------------------
  // Damage bonus formula field (poc.10 Story D) — a second, independent formula
  // editor instance mirroring the situational-modifier one above. Never folded
  // into the attack roll's own total; resolved to a formula *string* (dice terms
  // preserved) rather than a plain number when the roll is confirmed.
  // ---------------------------------------------------------------------------

  const damageBonusOverlayRef = ref<InstanceType<typeof FamiliarOverlayInput>>();
  const getDamageBonusInputElement = (): HTMLInputElement | undefined => damageBonusOverlayRef.value?.getInputElement();
  const getDamageBonusHighlightElement = (): HTMLDivElement | undefined => damageBonusOverlayRef.value?.getHighlightElement();
  const getDamageBonusDropdownMenuElement = (): HTMLElement | undefined => damageBonusOverlayRef.value?.getDropdownMenuElement();

  const damageBonusCurrentValue = computed(() => props.context.data.damageBonus || '');

  const {
    familiarOptions: damageBonusFamiliarOptions,
    showFamiliar: damageBonusShowFamiliar,
    familiarIndex: damageBonusFamiliarIndex,
    familiarPosition: damageBonusFamiliarPosition,
    localValue: damageBonusLocalValue,
    formulaErrors: damageBonusFormulaErrors,
    highlightedHTML: damageBonusHighlightedHTML,
    syncScroll: damageBonusSyncScroll,
    onInput: onDamageBonusInput,
    onBlur: onDamageBonusBlur,
    onKeyDown: onDamageBonusKeyDown,
    onFocus: onDamageBonusFocus,
    onFamiliarSelect: onDamageBonusFamiliarSelect,
  } = useFormulaEditor({
    contexts,
    currentValue: damageBonusCurrentValue,
    getInputElement: getDamageBonusInputElement,
    getHighlightElement: getDamageBonusHighlightElement,
    getDropdownMenuElement: getDamageBonusDropdownMenuElement,
    onCommit: (canonical) => {
      props.context.data.damageBonus = canonical;
    },
  });

  const damageBonusOverlayInputModel = computed(() => ({
    id: 'damage-bonus',
    name: 'damage-bonus',
    modelValue: damageBonusLocalValue.value,
    inputClass: 'formula-input',
    highlightClass: 'highlight-layer',
    inputWrapperClass: 'formula-input-wrapper',
    editContainerClass: 'formula-edit-container',
    inputStateClasses: { 'has-error': damageBonusFormulaErrors.value.length > 0 },
    highlightedHtml: damageBonusHighlightedHTML.value,
    showFamiliar: damageBonusShowFamiliar.value,
    familiarOptions: damageBonusFamiliarOptions.value,
    familiarIndex: damageBonusFamiliarIndex.value,
    familiarPosition: damageBonusFamiliarPosition.value,
  }));

  const damageBonusOverlayInputHandlers = {
    input: onDamageBonusInput,
    blur: onDamageBonusBlur,
    keydown: onDamageBonusKeyDown,
    focus: onDamageBonusFocus,
    scroll: damageBonusSyncScroll,
    select: onDamageBonusFamiliarSelect,
  };

  /** Resolves the damage-bonus formula against `#self`, preserving dice notation (e.g. sneak attack `1d6`). */
  function resolveDamageBonusFormula(formula: string): string {
    if (!formula) return '';
    const resolved = FormulaData.resolveSource(
      FormulaData.toSource(formula, { expectedType: 'string' }),
      buildDocumentDataMap(props.context.data.actor),
      ''
    );
    return resolved ?? '';
  }

  function formatBonus(n: number): string {
    return n >= 0 ? `+${n}` : `${n}`;
  }

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  function onRoll(): void {
    onBlur(); // force-commit any in-progress formula edit before resolving
    onDamageBonusBlur();
    const result: D20RollDialogResult = {
      situationalModifier: resolveSituationalModifier(props.context.data.situationalModifier),
      rollMode: props.context.data.rollMode,
    };
    if (props.context.data.combatModifiers) {
      result.combatModifiers = props.context.data.combatModifiers;
    }
    if (props.context.data.damageBonus !== undefined) {
      result.damageBonus = resolveDamageBonusFormula(props.context.data.damageBonus);
    }
    if (props.context.data.wieldMode !== undefined) {
      result.wieldMode = props.context.data.wieldMode;
    }
    if (props.context.data.hand !== undefined) {
      result.hand = props.context.data.hand;
    }
    if (props.context.data.ammoOptions?.length) {
      result.ammo = props.context.data.ammo ?? null;
    }
    props.context.resolve(result);
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

  .combat-modifiers {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;

    .modifier-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1 1 10rem;

      h4 {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 500;
      }
    }

    .modifier-toggle {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.85rem;

      .fa-circle-question {
        opacity: 0.6;
      }
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
