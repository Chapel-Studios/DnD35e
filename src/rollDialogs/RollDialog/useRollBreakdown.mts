import { extractFlatModifier } from '@source/dice/d20Formula.mjs';
import { buildSituationalModifierEntry } from '@source/dice/rollModifierBreakdown.mjs';
import { getModifiersFormula, substituteDisplayValues } from '@source/dice/rollModifiers.mjs';
import type { RollModifier } from '@source/dice/types.mjs';
import { computed, ref } from 'vue';

import { resolveFormulaString } from './RollDialogStore.mjs';
import type { RollBreakdownData, RollBreakdownStore, RollDialogContext } from './types.mjs';

function useRollBreakdown(
  context: Pick<RollDialogContext, 'formulaContext' | 'familiarSchema'>,
  getData: () => RollBreakdownData,
  getAdditionalModifiers: () => RollModifier[] = () => [],
  situationalLabel = game.i18n.localize('dnd35e.ROLL.SituationalModifier')
): RollBreakdownStore {
  const situational = ref(getData().situationalModifier ?? '');
  const resolvedSituational = computed(() => resolveFormulaString(
    situational.value, context.formulaContext, context.familiarSchema
  ));
  // True values — this is what the store's `roll()` action returns as `finalModifiers`,
  // and must never have `displayValue` substituted in (that would corrupt the actual roll).
  const modifiers = computed(() => [
    ...getData().immutableModifiers,
    ...getAdditionalModifiers(),
    ...buildSituationalModifierEntry(resolvedSituational.value, situationalLabel),
  ]);
  // Display-only, NUMERIC total (poc.10 Story I) — `substituteDisplayValues()` swaps in
  // `displayValue` for `value` where present WITHOUT expanding an aggregate's `breakdown`
  // into separate rows; those rows are often non-additive display annotations (e.g.
  // `{ value: 3, formula: '* 3' }`), not summable roll terms, so feeding them through
  // `getModifiersFormula()` would silently compute the wrong total. Full breakdown
  // expansion (`getDisplayModifiers()`) stays exclusively a tooltip concern — see
  // `RollModifierTooltip.vue`, which calls it directly against `modifiers.value`.
  const activeFormula = computed(() => getModifiersFormula(substituteDisplayValues(modifiers.value)));

  return {
    label: getData().label,
    situationalModifier: computed({
      get: () => situational.value,
      set: (value: string) => { situational.value = value; },
    }),
    modifiers,
    baseTotal: computed(() => extractFlatModifier(getModifiersFormula(substituteDisplayValues(getData().immutableModifiers))).flat),
    activeTotal: computed(() => extractFlatModifier(activeFormula.value).flat),
    activeFormula,
  };
}

export { useRollBreakdown };
