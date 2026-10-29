import { extractFlatModifier } from '@source/dice/d20Formula.mjs';
import { buildSituationalModifierEntry } from '@source/dice/rollModifierBreakdown.mjs';
import { getModifiersFormula } from '@source/dice/rollModifiers.mjs';
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
  const modifiers = computed(() => [
    ...getData().immutableModifiers,
    ...getAdditionalModifiers(),
    ...buildSituationalModifierEntry(resolvedSituational.value, situationalLabel),
  ]);
  const activeFormula = computed(() => getModifiersFormula(modifiers.value));

  return {
    label: getData().label,
    situationalModifier: computed({
      get: () => situational.value,
      set: (value: string) => { situational.value = value; },
    }),
    modifiers,
    baseTotal: computed(() => extractFlatModifier(getModifiersFormula(getData().immutableModifiers)).flat),
    activeTotal: computed(() => extractFlatModifier(activeFormula.value).flat),
    activeFormula,
  };
}

export { useRollBreakdown };
