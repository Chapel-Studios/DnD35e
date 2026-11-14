import { buildD20Formula, combineDiceFormula, flavorTerm } from './d20Formula.mjs';
import type { RollModifier, WeaponDamageRollModifier } from './types.mjs';

function getModifierFormula(modifier: RollModifier): string {
  return modifier.formula ?? String(modifier.value);
}

function getModifiersFormula(modifiers: RollModifier[]): string {
  return combineDiceFormula(modifiers.filter(mod => !mod.isIgnored).map(getModifierFormula));
}

/** Substitutes `displayValue` for `value` where present, without touching anything else. */
function substituteDisplayValue(mod: RollModifier): RollModifier {
  return mod.displayValue !== undefined ? { ...mod, value: mod.displayValue } : mod;
}

/**
 * Shallow, non-expanding counterpart to `getDisplayModifiers()` below: substitutes
 * `displayValue` for `value` where present, but never expands an aggregate entry's
 * `breakdown` into separate rows. This is the correct building block whenever a NUMBER
 * needs computing from the modifier list (e.g. the roll dialog's live total preview,
 * `useRollBreakdown.mts`'s `activeFormula`/`baseTotal`) — an aggregate's `breakdown` rows
 * are often non-additive display annotations (e.g. `{ value: 3, formula: '* 3' }`), not
 * summable roll terms, so feeding them through `getModifiersFormula()`/
 * `extractFlatModifier()` silently produces the wrong total. Full breakdown expansion
 * stays exclusively a tooltip concern (see `RollModifierTooltip.vue`, which calls
 * `getDisplayModifiers()` directly).
 */
function substituteDisplayValues(modifiers: RollModifier[]): RollModifier[] {
  return modifiers.map(substituteDisplayValue);
}

/**
 * Expand prepared values only for presentation, never for rolling or summation — also
 * substitutes `displayValue` for `value` where present (poc.10 Story I: masked
 * combat-adjacent secrets). `getModifiersFormula()`/`buildModifiersD20Formula()` (the
 * actual roll) never call this; they always read the true `value` directly.
 *
 * A `displayValue` entry short-circuits breakdown expansion entirely — showing the
 * per-effect breakdown (always true values; nothing there carries its own mask) would
 * leak exactly what masking the aggregate was meant to hide, since most masked totals
 * (e.g. `system.init`) always have at least one contributing AE (a baseline Dex-mod
 * change) and would otherwise always take the breakdown branch below instead of this one.
 */
function getDisplayModifiers(modifiers: RollModifier[]): RollModifier[] {
  return modifiers.flatMap(mod => (mod.displayValue === undefined && mod.breakdown?.length)
    ? getDisplayModifiers(mod.breakdown).map(entry => mod.isIgnored
      ? { ...entry, isIgnored: true, ignoredReason: mod.ignoredReason }
      : entry)
    : [substituteDisplayValue(mod)]);
}

function buildModifiersD20Formula(modifiers: RollModifier[], label: string): { formula: string; displayFormula: string } {
  const applied = modifiers.filter(mod => !mod.isIgnored);
  const flat = applied.filter(mod => !mod.formula).reduce((sum, mod) => sum + mod.value, 0);
  const dice = applied.filter(mod => !!mod.formula);
  return {
    formula: [
      buildD20Formula(flat, '', { base: label }),
      ...dice.map(mod => `+ ${flavorTerm(mod.formula!, mod.label)}`),
    ].join(' '),
    displayFormula: buildD20Formula(flat, combineDiceFormula(dice.map(mod => mod.formula))),
  };
}

function flavorAdditiveDamageFormula(formula: string, label: string): { formula: string; diceCount: number } | null {
  const { DiceTerm, NumericTerm, OperatorTerm } = foundry.dice.terms;
  const terms = Roll.parse(formula, {});
  if (!terms.length || terms.some(term => !(term instanceof DiceTerm || term instanceof NumericTerm || (
    term instanceof OperatorTerm && (term.operator === '+' || term.operator === '-')
  )))) return null;

  const flavoredTerms = terms.map(term => {
    if (term instanceof OperatorTerm) return term.operator;
    return term.flavor ? term.formula : `${term.formula}[${label}]`;
  });
  return { formula: flavoredTerms.join(' '), diceCount: terms.filter(term => term instanceof DiceTerm).length };
}

function buildModifiersDamageFormula(modifiers: WeaponDamageRollModifier[]): { formula: string; exemptDiceIndices: number[] } {
  const fragments: string[] = [];
  const exemptDiceIndices: number[] = [];
  let diceOffset = 0;
  for (const modifier of modifiers.filter(mod => !mod.isIgnored)) {
    let fragment = String(modifier.value);
    let modifierExemptDiceIndices = modifier.exemptDiceIndices ?? [];
    if (modifier.formula) {
      if (modifier.exemptDiceIndices !== undefined) {
        fragment = modifier.formula;
      } else {
        const additive = flavorAdditiveDamageFormula(modifier.formula, modifier.label);
        fragment = additive ? additive.formula : flavorTerm(modifier.formula, modifier.label);
        if (additive) modifierExemptDiceIndices = Array.from({ length: additive.diceCount }, (_, index) => index);
      }
    }
    for (const index of modifierExemptDiceIndices) exemptDiceIndices.push(diceOffset + index);
    diceOffset += new Roll(fragment).terms.filter(term => term instanceof foundry.dice.terms.DiceTerm).length;
    fragments.push(fragment);
  }
  return { formula: fragments.join(' + ') || '0', exemptDiceIndices };
}

export {
  buildModifiersD20Formula,
  buildModifiersDamageFormula,
  getDisplayModifiers,
  getModifierFormula,
  getModifiersFormula,
  substituteDisplayValues,
};
