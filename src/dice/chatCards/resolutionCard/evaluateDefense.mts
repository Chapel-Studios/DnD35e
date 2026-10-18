/**
 * evaluateDefense — folds a Roll Defense Dialog result together with the attack card's
 * already-known attack total/critical-threat state into a final hit/miss + confirmed-crit
 * determination (poc.10 Story E, §10.7). Pure aside from the Concealment miss-chance roll
 * (a genuine d% check — can't be pre-computed by the dialog itself, since it isn't known
 * until resolution time whether Concealment even matters).
 *
 * @module
 */
import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import type { RollDefenseDialogResult } from '@source/rollDialogs/RollDefenseDialog/types.mjs';
import { COVER_AC_BONUS, IMPROVED_COVER } from '@source/rollDialogs/RollDefenseDialog/types.mjs';

import { extractFlatModifier } from '../../d20Formula.mjs';
import type { RollModifier } from '../../types.mjs';

interface DefenseEvaluation {
  hit: boolean;
  criticalHit: boolean;
  /** The attack roll total this was resolved against — restated alongside `effectiveAc` on the resolution card. */
  attackTotal: number;
  /** The AC (or touch AC) this attack was actually compared against — `0` in `noCheck` mode, where no comparison happens. */
  effectiveAc: number;
  /** Whether the d% Concealment roll alone caused an otherwise-successful hit to miss. */
  concealmentMissed: boolean;
  /** Every named contributor to `effectiveAc` (base AC first, then checked combat modifiers/cover/situational) — mirrors D35E's `damage-description.html` "AC Details" table (`acModifiers`). Empty in `noCheck` mode. */
  acBreakdown: RollModifier[];
}

/**
 * `checkMode: 'noCheck'` skips the AC comparison and the Concealment roll entirely — always a
 * hit, with `ignoreCriticalHit` still respected since that's an override, not a roll.
 */
async function evaluateDefense(
  attackTotal: number,
  isCriticalThreat: boolean,
  critConfirmTotal: number | null,
  dialogResult: RollDefenseDialogResult,
  target: ACTORS_DND35E
): Promise<DefenseEvaluation> {
  if (dialogResult.checkMode === 'noCheck') {
    return {
      hit: true,
      criticalHit: isCriticalThreat && !dialogResult.ignoreCriticalHit,
      attackTotal,
      effectiveAc: 0,
      concealmentMissed: false,
      acBreakdown: [],
    };
  }

  const baseAc = dialogResult.checkMode === 'touch' ? target.system.defense.touchAC : target.system.defense.armorClass;
  const checkedCombatModifiers = dialogResult.combatModifiers.filter(mod => mod.checked && mod.value !== 0);
  const combatModifierSum = checkedCombatModifiers.reduce((sum, mod) => sum + mod.value, 0);
  const coverValue = COVER_AC_BONUS[dialogResult.covered];
  // AC isn't a rolled check (barring the separate, not-yet-consumed ROLLED_DEFENSE_VARIANT house
  // rule) — only the flat portion of a dice-bearing situational modifier applies here, same
  // convention the dialog's own live AC preview already uses (`resolveFormulaNumber`).
  const situationalFlat = extractFlatModifier(dialogResult.situationalModifier).flat;
  const effectiveAc = baseAc + combatModifierSum + coverValue + situationalFlat;

  const acBreakdown: RollModifier[] = [
    { label: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.BaseAc'), value: baseAc },
    ...checkedCombatModifiers.map(mod => ({ label: mod.label, value: mod.value })),
  ];
  if (coverValue !== 0) {
    acBreakdown.push({
      label: game.i18n.localize(dialogResult.covered === IMPROVED_COVER ? 'dnd35e.COMBAT.Covered.improvedCover' : 'dnd35e.COMBAT.Covered.covered'),
      value: coverValue,
    });
  }
  if (situationalFlat !== 0) {
    acBreakdown.push({ label: game.i18n.localize('dnd35e.ROLL.SituationalModifier'), value: situationalFlat });
  }

  let concealmentMissed = false;
  if (dialogResult.concealment > 0) {
    const concealmentRoll = await new Roll('1d100').evaluate();
    concealmentMissed = (concealmentRoll.total ?? 0) <= dialogResult.concealment;
  }

  const hit = attackTotal >= effectiveAc && !concealmentMissed;
  const criticalHit = hit
    && isCriticalThreat
    && !dialogResult.ignoreCriticalHit
    && critConfirmTotal !== null
    && critConfirmTotal >= effectiveAc;

  return { hit, criticalHit, attackTotal, effectiveAc, concealmentMissed, acBreakdown };
}

export { evaluateDefense };
export type { DefenseEvaluation };
