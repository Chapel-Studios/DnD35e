import type { RollMode } from '@common/constants.mjs';
import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import type { DocumentContext } from '@helpers/formulae/index.mjs';
import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
import { extractFlatModifier } from '@source/dice/d20Formula.mjs';
import { computed, ref } from 'vue';

import type { RollDialogContext, RollDialogData, RollDialogResult } from './types.mjs';

const RollDialogStoreSymbol = Symbol('RollDialogStore');

function resolveFormulaString(formula: string, formulaContext: Record<string, DocumentContext>, familiarSchema: FamiliarSchema): string {
  if (!formula) return '';
  const resolved = FormulaData.resolveSource(
    FormulaData.toSource(formula, { expectedType: 'string' }),
    formulaContext, '', [], undefined, undefined, familiarSchema
  );
  if (resolved === null) throw new Error(`Unable to resolve roll formula: "${formula}"`);
  return String(resolved);
}

function resolveFormulaNumber(formula: string, formulaContext: Record<string, DocumentContext>, familiarSchema: FamiliarSchema): number {
  return extractFlatModifier(resolveFormulaString(formula, formulaContext, familiarSchema)).flat;
}

function formatBonus(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function useRollDialogStore<TData extends RollDialogData, TResult extends RollDialogResult>(context: RollDialogContext<TData, TResult>) {
  const rollMode = ref(context.data.rollMode);
  return {
    actor: {
      document: computed(() => context.data.actor),
      image: computed(() => context.data.actor.img),
      name: computed(() => context.data.actor.name),
    },
    app: {
      title: computed(() => context.data.title),
      rollMode: computed({
        get: () => rollMode.value,
        set: (value: RollMode) => { rollMode.value = value; },
      }),
      familiarSchema: computed(() => context.familiarSchema),
      formulaContext: computed(() => context.formulaContext),
    },
    actions: { cancel: () => context.cancel() },
  };
}

type RollDialogBaseStore = ReturnType<typeof useRollDialogStore>;
type RollDialogAppStore = RollDialogBaseStore['app'];
type RollDialogBaseActions = RollDialogBaseStore['actions'];
type RollDialogStore = RollDialogBaseStore & { actions: RollDialogBaseActions & { roll: () => void } };

export type { RollDialogAppStore, RollDialogBaseActions, RollDialogBaseStore, RollDialogStore };
export { formatBonus, resolveFormulaNumber, resolveFormulaString, RollDialogStoreSymbol, useRollDialogStore };
