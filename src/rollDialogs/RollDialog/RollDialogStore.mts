import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import type { DocumentContext } from '@helpers/formulae/index.mjs';
import { extractFlatModifier } from '@source/dice/index.mjs';
import type { VueDialogContext } from '@vueApps/VueDialogMixin.mjs';
import type { ComputedRef, WritableComputedRef } from 'vue';
import { computed } from 'vue';

import type { RollDialogData, RollDialogResult } from './types.mjs';

const RollDialogStoreSymbol = Symbol('RollDialogStore');

/**
 * Resolves a situational-modifier-style formula against a pre-built `documentDataMap`
 * (`buildDocumentDataMap(actor)` for plain self-only dialogs; weapon-attack dialogs build
 * a richer `actor`/`item`/`thisAttack`/`target` map, poc.10 Story D) to a plain preview
 * number (0 on empty/failure). Dice-bearing terms can't be pre-rolled into this preview
 * (see `FormulaData._finalizeResolvedValue` — `number`-expected dice formulas stay
 * unrolled), so only the term's flat/non-dice portion (via `extractFlatModifier`)
 * contributes here; the full term (dice included) still reaches the real roll via
 * `resolveFormulaString`/`buildTotalFormula`.
 */
function resolveFormulaNumber(formula: string, documentDataMap: Record<string, DocumentContext>): number {
  const resolved = resolveFormulaString(formula, documentDataMap);
  if (!resolved) return 0;
  return extractFlatModifier(resolved).flat;
}

/** Resolves a damage-bonus-style formula against a pre-built `documentDataMap`, preserving dice notation (e.g. sneak attack `1d6`). */
function resolveFormulaString(formula: string, documentDataMap: Record<string, DocumentContext>): string {
  if (!formula) return '';
  const resolved = FormulaData.resolveSource(
    FormulaData.toSource(formula, { expectedType: 'string' }),
    documentDataMap,
    ''
  );
  return typeof resolved === 'string' ? resolved : String(resolved);
}

/** Formats a plain number as a signed bonus fragment, e.g. `4` -> `+4`, `-2` -> `-2`. */
function formatBonus(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Formats a resolved situational-modifier-style term (may itself contain dice, e.g. `1d6 + 2`) as
 * a signed formula fragment, e.g. `1d6 + 2` -> `+ 1d6 + 2`. Blank terms and purely-flat-zero terms
 * (e.g. `0`) resolve to `''` so callers can filter them out of the joined formula — a zero situational
 * bonus shouldn't clutter the total row. Dice-only terms are kept even when their resolved numeric
 * value is 0 (a dice term can't be pre-rolled into the preview number, see `resolveFormulaNumber`). */
function formatModifierTerm(term: string): string {
  const trimmed = term.trim();
  if (!trimmed) return '';
  const { flat, hasDice } = extractFlatModifier(trimmed);
  if (!hasDice && flat === 0) return '';
  if (trimmed.startsWith('-')) return `- ${trimmed.slice(1).trim()}`;
  if (trimmed.startsWith('+')) return `+ ${trimmed.slice(1).trim()}`;
  return `+ ${trimmed}`;
}

/**
 * Joins a numeric base bonus with any additional resolved formula fragments into the exact,
 * `1d20`-less terms that will be appended to the real roll formula (mirrors `buildD20Formula`'s
 * term assembly in `@source/dice/d20Formula.mjs`, minus the base die) — this is total-row preview
 * text only, no flavor tags.
 */
function buildTotalFormula(base: number, ...fragments: string[]): string {
  return [formatBonus(base), ...fragments.map(formatModifierTerm).filter(Boolean)].join(' ');
}

/**
 * Base store for any d20 roll dialog (poc.10 Story D refactor) — actor/app/roll sections
 * read/written straight off the injected `VueDialogContext`'s reactive `data`. Type-specific
 * stores (`SavingThrowRollDialogStore`, `WeaponAttackRollDialogStore`, ...) call this first
 * and layer their own formula field(s) + `actions.roll()` on top — see those modules. There is
 * deliberately no generic `situationalModifier` here — each dialog type owns its own formula
 * field(s) with its own name/label/context.
 *
 * `roll.total`/`roll.totalFormula` are computed once, here, since only `RollDialog.vue` (the
 * shared root component) ever reads them — leaf stores never override them. Instead each leaf
 * calls `actions.registerTotalModifier()` once per situational field it owns (e.g. Saving Throw's
 * `situationalModifier`, Weapon Attack's `combatModifierSum` + `attackSituationalModifier`), and
 * this store sums/joins every registered contribution.
 *
 * `actions.registerPreRollCommit`/`commitPendingEdits` exist because formula-editable fields
 * only write their canonical value back to `context.data` on blur (`useFormulaEditor`'s
 * `onCommit`). Since every `RollDialogFormulaField` instance owns its own formula-editor
 * instance, the Roll button needs to force-commit all of them before `actions.roll()` reads
 * `context.data` — every `RollDialogFormulaField` registers its own `onBlur` here, and
 * `RollDialog.vue`'s Roll button calls `commitPendingEdits()` right before `actions.roll()`.
 */
function useRollDialogStore<TData extends RollDialogData, TResult extends RollDialogResult>(
  context: VueDialogContext<TData, TResult>
): RollDialogBaseStore {
  const preRollCommitCallbacks: Array<() => void> = [];
  const totalModifierContributions: RollDialogModifierContribution[] = [];

  const actor = {
    document: computed(() => context.data.actor),
    image: computed(() => context.data.actor.img ?? ''),
    name: computed(() => context.data.actor.token?.name ?? context.data.actor.name ?? ''),
  };

  const app = {
    title: computed(() => context.data.title ?? ''),
    baseLabel: computed(() => context.data.baseLabel),
    baseTotal: computed(() => context.data.baseTotal),
    rollMode: computed({
      get: () => context.data.rollMode,
      set: (value: string) => { context.data.rollMode = value; },
    }),
    total: computed(() => context.data.baseTotal
      + totalModifierContributions.reduce((sum, contribution) => sum + contribution.value.value, 0)),
    totalFormula: computed(() => buildTotalFormula(
      context.data.baseTotal,
      ...totalModifierContributions.map((contribution) => contribution.formula.value)
    )),
  };

  const actions = {
    cancel: () => context.cancel(),
    registerPreRollCommit: (fn: () => void) => { preRollCommitCallbacks.push(fn); },
    commitPendingEdits: () => { preRollCommitCallbacks.forEach((fn) => fn()); },
    registerTotalModifier: (contribution: RollDialogModifierContribution) => { totalModifierContributions.push(contribution); },
  };

  return { actor, app, actions };
}

interface RollDialogActorStore {
  document: ComputedRef<RollDialogData['actor']>;
  image: ComputedRef<string>;
  name: ComputedRef<string>;
}
interface RollDialogAppStore {
  title: ComputedRef<string>;
  baseLabel: ComputedRef<string>;
  baseTotal: ComputedRef<number>;
  rollMode: WritableComputedRef<string>;
  total: ComputedRef<number>;
  totalFormula: ComputedRef<string>;
}
/** One situational field's contribution to `roll.total`/`roll.totalFormula`, registered by a leaf store via `actions.registerTotalModifier()`. */
interface RollDialogModifierContribution {
  value: ComputedRef<number>;
  formula: ComputedRef<string>;
}
interface RollDialogBaseActions {
  cancel: () => void;
  registerPreRollCommit: (fn: () => void) => void;
  commitPendingEdits: () => void;
  registerTotalModifier: (contribution: RollDialogModifierContribution) => void;
}
interface RollDialogActions extends RollDialogBaseActions {
  /** Assembles this dialog's full result and calls `context.resolve()` — implemented per type. */
  roll: () => void;
}
/** Shape returned by `useRollDialogStore()` itself — missing `actions.roll`, added by each subtype store. */
interface RollDialogBaseStore {
  actor: RollDialogActorStore;
  app: RollDialogAppStore;
  actions: RollDialogBaseActions;
}
/** Full store shape every type-specific store (and `RollDialog.vue`) works with. */
interface RollDialogStore {
  actor: RollDialogActorStore;
  app: RollDialogAppStore;
  actions: RollDialogActions;
}

export type {
  RollDialogActions,
  RollDialogActorStore,
  RollDialogAppStore,
  RollDialogBaseActions,
  RollDialogBaseStore,
  RollDialogModifierContribution,
  RollDialogStore,
};
export {
  formatBonus,
  resolveFormulaNumber,
  resolveFormulaString,
  RollDialogStoreSymbol,
  useRollDialogStore,
};
