import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';

/** Input data for the base roll dialog. */
interface RollDialogData {
  /** Already-localized dialog title, e.g. "Roll Fortitude Save". */
  title: string;
  /** Already-localized label for the base total row, e.g. "Fortitude". */
  baseLabel: string;
  /** The actor's current computed value for the stat being rolled. */
  baseTotal: number;
  rollMode: string;
  /** The rolling actor — used to build the `#self` FormulaFamiliar context for formula inputs. */
  actor: ACTORS_DND35E;
}

/** Result returned when the user confirms the roll. */
interface RollDialogResult {
  rollMode: string;
}

export type {
  RollDialogData,
  RollDialogResult,
};
