import type { VueDialogContext } from '@vueApps/index.mjs';

import type { RollDialogData, RollDialogResult } from '../RollDialog/types.mjs';

interface SavingThrowRollDialogData extends RollDialogData {
  /**
   * A formula (not a plain number) — resolved through FormulaFamiliar against `#self`
   * (the rolling actor) once the user rolls. See `RollDialogFormulaField`.
   */
  situationalModifier: string;
}

interface SavingThrowRollDialogResult extends RollDialogResult {
  /** The resolved situational-modifier term — a plain number when the user entered one, or a raw formula/dice term (e.g. `1d6`) otherwise. */
  situationalModifier: string;
}

interface SavingThrowRollDialogContext extends VueDialogContext<SavingThrowRollDialogData, SavingThrowRollDialogResult> {}

export type {
  SavingThrowRollDialogContext,
  SavingThrowRollDialogData,
  SavingThrowRollDialogResult,
};
