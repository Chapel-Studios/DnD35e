import { buildD20Formula, combineDiceFormula, flavorTerm } from './d20Formula.mjs';
import type { RollModifier, WeaponDamageRollModifier } from './types.mjs';

function getModifierFormula(modifier: RollModifier): string {
  return modifier.formula ?? String(modifier.value);
}

function getModifiersFormula(modifiers: RollModifier[]): string {
  return combineDiceFormula(modifiers.filter(mod => !mod.isIgnored).map(getModifierFormula));
}

/** Expand prepared values only for presentation, never for rolling or summation. */
function getDisplayModifiers(modifiers: RollModifier[]): RollModifier[] {
  return modifiers.flatMap(mod => mod.breakdown?.length
    ? getDisplayModifiers(mod.breakdown).map(entry => mod.isIgnored
      ? { ...entry, isIgnored: true, ignoredReason: mod.ignoredReason }
      : entry)
    : [mod]);
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

function buildModifiersDamageFormula(modifiers: WeaponDamageRollModifier[]): { formula: string; exemptDiceIndices: number[] } {
  const fragments: string[] = [];
  const exemptDiceIndices: number[] = [];
  let diceOffset = 0;
  for (const modifier of modifiers.filter(mod => !mod.isIgnored)) {
    const fragment = modifier.formula
      ? (modifier.exemptDiceIndices
        ? modifier.formula
        : flavorTerm(modifier.formula, modifier.label))
      : String(modifier.value);
    for (const index of modifier.exemptDiceIndices ?? []) exemptDiceIndices.push(diceOffset + index);
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
};
