import { useRollDialogStore } from '../RollDialog/RollDialogStore.mjs';
import { useRollBreakdown } from '../RollDialog/useRollBreakdown.mjs';
import type { SavingThrowRollDialogContext } from './types.mjs';

function useSavingThrowRollDialogStore(context: SavingThrowRollDialogContext) {
  const base = useRollDialogStore(context);
  const savingThrow = useRollBreakdown(context, () => context.data.savingThrow);
  return {
    ...base,
    savingThrow,
    actions: {
      ...base.actions,
      roll: () => context.resolve({
        rollMode: base.app.rollMode.value,
        finalModifiers: foundry.utils.deepClone(savingThrow.modifiers.value),
      }),
    },
  };
}

type SavingThrowRollDialogStore = ReturnType<typeof useSavingThrowRollDialogStore>;
export type { SavingThrowRollDialogStore };
export { useSavingThrowRollDialogStore };
