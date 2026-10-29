import type { RollModifier } from '@source/dice/index.mjs';

import type { RollBreakdownData, RollDialogContext, RollDialogData, RollDialogResult } from '../RollDialog/types.mjs';

interface SavingThrowRollDialogData extends RollDialogData {
  savingThrow: RollBreakdownData;
}

interface SavingThrowRollDialogResult extends RollDialogResult {
  /** The resolved situational-modifier term — a plain number when the user entered one, or a raw formula/dice term (e.g. `1d6`) otherwise. */
  finalModifiers: RollModifier[];
}

interface SavingThrowRollDialogContext extends RollDialogContext<SavingThrowRollDialogData, SavingThrowRollDialogResult> {}

export type {
  SavingThrowRollDialogContext,
  SavingThrowRollDialogData,
  SavingThrowRollDialogResult,
};
