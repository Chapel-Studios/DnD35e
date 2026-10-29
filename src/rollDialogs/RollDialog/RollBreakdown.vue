<template>
  <div>
    <div v-if="type === 'single'" class="base-row subgrid">
      <span class="label">{{ label }}</span>
      <span class="value">{{ formatBonus(baseTotal ?? 0) }}</span>
    </div>
    <div v-else class="bonus-row">
      <span class="label">{{ label }}</span>
      <span class="value">
        {{ displayFormula }}
        <RollModifierTooltip :modifiers="modifiers" />
      </span>
    </div>
    <RollDialogFormulaField
      :id="inputId"
      v-model="situationalModifier"
      :label="situationalLabel"
      :schema="schema"
    />
    <div v-if="type === 'single'" class="total-row subgrid">
      <span class="label">{{ localize('dnd35e.ROLL.Total') }}</span>
      <span class="value">
        {{ displayFormula }}
        <RollModifierTooltip :modifiers="modifiers" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
  import { computed } from 'vue';

  import RollDialogFormulaField from './RollDialogFormulaField.vue';
  import { formatBonus } from './RollDialogStore.mjs';
  import RollModifierTooltip from './RollModifierTooltip.vue';
  import type { RollBreakdownStore } from './types.mts';

  const props = withDefaults(defineProps<RollBreakdownStore & {
    type?: 'single' | 'multi';
    inputId?: string;
    situationalLabel?: string;
    showSign?: boolean;
    schema: FamiliarSchema;
  }>(), {
    type: 'single',
    inputId: 'situational-modifier',
    situationalLabel: 'dnd35e.ROLL.SituationalModifier',
    showSign: true,
  });
  const { situationalModifier, label, modifiers, baseTotal } = props;
  const displayFormula = computed(() => {
    const formula = props.activeFormula.value;
    const value = Number(formula);
    return props.showSign && Number.isFinite(value)
      ? formatBonus(value)
      : formula;
  });
  const localize = (key: string) => game.i18n.localize(key);
</script>

<style scoped lang="scss">
  .base-row, .total-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;

    .label {
      font-weight: 500;
    }
  }

  .total-row {
    font-size: 1.2rem;
    font-weight: 700;
    border-top: 1px solid var(--color-border);
    padding-top: 0.5rem;
  }

  .bonus-row {
    display: flex;
    justify-content: space-around;
    font-size: 1.2rem;
  }
</style>
