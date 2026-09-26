import { buildDocumentDataMap } from '@helpers/formulae/utils.mjs';
import type { VueDialogContext } from '@vueApps/VueDialogMixin.mjs';
import type { WritableComputedRef } from 'vue';
import { computed } from 'vue';

import type { RollDialogStore } from '../RollDialog/RollDialogStore.mjs';
import { resolveFormulaNumber, resolveFormulaString, useRollDialogStore } from '../RollDialog/RollDialogStore.mjs';
import type { SavingThrowRollDialogData, SavingThrowRollDialogResult } from './types.mjs';

/** Saves/initiative are plain d20 checks — the only extra field is their own situational-modifier formula (poc.10 Story D refactor). */
function useSavingThrowRollDialogStore(
  context: VueDialogContext<SavingThrowRollDialogData, SavingThrowRollDialogResult>
): SavingThrowRollDialogStore {
  const base = useRollDialogStore(context);

  const situationalModifier = computed({
    get: () => context.data.situationalModifier,
    set: (value: string) => { context.data.situationalModifier = value; },
  });

  base.actions.registerTotalModifier({
    value: computed(() => resolveFormulaNumber(context.data.situationalModifier, buildDocumentDataMap(context.data.actor))),
    formula: computed(() => resolveFormulaString(context.data.situationalModifier, buildDocumentDataMap(context.data.actor))),
  });

  const rollAction = (): void => {
    context.resolve({
      situationalModifier: resolveFormulaString(context.data.situationalModifier, buildDocumentDataMap(context.data.actor)),
      rollMode: context.data.rollMode,
    });
  };

  return {
    ...base,
    save: { situationalModifier },
    actions: { ...base.actions, roll: rollAction },
  };
}

interface SavingThrowRollDialogSaveStore {
  situationalModifier: WritableComputedRef<string>;
}
interface SavingThrowRollDialogStore extends RollDialogStore {
  save: SavingThrowRollDialogSaveStore;
}

export type { SavingThrowRollDialogSaveStore, SavingThrowRollDialogStore };
export { useSavingThrowRollDialogStore };

