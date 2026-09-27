import { buildDocumentDataMap } from '@helpers/formulae/utils.mjs';
import type { VueDialogContext } from '@vueApps/VueDialogMixin.mjs';
import type { WritableComputedRef } from 'vue';
import { computed } from 'vue';

import type { RollDialogStore } from '../RollDialog/RollDialogStore.mjs';
import { resolveFormulaNumber, resolveFormulaString, useRollDialogStore } from '../RollDialog/RollDialogStore.mjs';
import type { InitiativeRollDialogData, InitiativeRollDialogResult } from './types.mjs';

/** Initiative is a plain d20 check — the only extra field is its own situational-modifier formula (poc.10 Story D refactor). */
function useInitiativeRollDialogStore(
  context: VueDialogContext<InitiativeRollDialogData, InitiativeRollDialogResult>
): InitiativeRollDialogStore {
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
    initiative: { situationalModifier },
    actions: { ...base.actions, roll: rollAction },
  };
}

interface InitiativeRollDialogInitiativeStore {
  situationalModifier: WritableComputedRef<string>;
}
interface InitiativeRollDialogStore extends RollDialogStore {
  initiative: InitiativeRollDialogInitiativeStore;
}

export type { InitiativeRollDialogInitiativeStore, InitiativeRollDialogStore };
export { useInitiativeRollDialogStore };
