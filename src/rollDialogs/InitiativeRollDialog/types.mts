import type { VueDialogContext } from '@vueApps/VueDialogMixin.mjs';

import type { RollDialogData, RollDialogResult } from '../RollDialog/types.mjs';

/**
 * A standalone dialog type (poc.10 Story D refactor), deliberately NOT shared with
 * `SavingThrowRollDialog` even though the two are structurally identical today — the set of
 * actors that can roll initiative may diverge from the set with saving throws as the system
 * grows (e.g. hazards/vehicles), so keeping them as separate types avoids baking that
 * coincidence into the type system.
 */
interface InitiativeRollDialogData extends RollDialogData {
  /**
   * A formula (not a plain number) — resolved through FormulaFamiliar against `#self`
   * (the rolling actor) once the user rolls. See `RollDialogFormulaField`.
   */
  situationalModifier: string;
}

interface InitiativeRollDialogResult extends RollDialogResult {
  /** The resolved situational-modifier term — a plain number when the user entered one, or a raw formula/dice term (e.g. `1d6`) otherwise. */
  situationalModifier: string;
}

interface InitiativeRollDialogContext extends VueDialogContext<InitiativeRollDialogData, InitiativeRollDialogResult> {
}

export type {
  InitiativeRollDialogContext,
  InitiativeRollDialogData,
  InitiativeRollDialogResult,
};
