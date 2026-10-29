import { useRollDialogStore } from '../RollDialog/RollDialogStore.mjs';
import { useRollBreakdown } from '../RollDialog/useRollBreakdown.mjs';
import type { InitiativeRollDialogContext } from './types.mjs';

function useInitiativeRollDialogStore(context: InitiativeRollDialogContext) {
  const base = useRollDialogStore(context);
  const initRoll = useRollBreakdown(context, () => context.data.initRoll);
  return {
    ...base,
    initRoll,
    actions: {
      ...base.actions,
      roll: () => context.resolve({
        rollMode: base.app.rollMode.value,
        finalModifiers: foundry.utils.deepClone(initRoll.modifiers.value),
      }),
    },
  };
}

type InitiativeRollDialogStore = ReturnType<typeof useInitiativeRollDialogStore>;
export type { InitiativeRollDialogStore };
export { useInitiativeRollDialogStore };
