import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import type { RollMode } from '@common/constants.mjs';
import type { DocumentContext } from '@helpers/formulae/index.mjs';
import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
import type { RollModifier } from '@source/dice/index.mjs';
import type { VueDialogContext } from '@vueApps/VueDialogMixin.mjs';
import type { ComputedRef, WritableComputedRef } from 'vue';

type RollBreakdownData = {
  label: string;
  immutableModifiers: RollModifier[];
  situationalModifier?: string;
};

/** Input data for the base roll dialog. */
interface RollDialogData {
  /** Already-localized dialog title, e.g. "Roll Fortitude Save". */
  title: string;
  rollMode: RollMode;
  /** The rolling actor — used to build the `#self` FormulaFamiliar context for formula inputs. */
  actor: ACTORS_DND35E;
}

/** Result returned when the user confirms the roll. */
interface RollDialogResult {
  rollMode: RollMode;
}

interface RollDialogContext<TData extends RollDialogData = RollDialogData, TResult extends RollDialogResult = RollDialogResult>
  extends VueDialogContext<TData, TResult> {
  /** The caller's own formula context (live documents keyed by context name), used to resolve formulas. */
  formulaContext: Record<string, DocumentContext>;
  /** Schema built by the caller from `formulaContext` before opening the dialog. */
  familiarSchema: FamiliarSchema;
}

type RollBreakdownStore = {
  label: string;
  situationalModifier: WritableComputedRef<string>;
  modifiers: ComputedRef<RollModifier[]>;
  baseTotal: ComputedRef<number>;
  activeTotal: ComputedRef<number>;
  activeFormula: ComputedRef<string>;
}

export type {
  RollBreakdownData,
  RollBreakdownStore,
  RollDialogContext,
  RollDialogData,
  RollDialogResult,
};
