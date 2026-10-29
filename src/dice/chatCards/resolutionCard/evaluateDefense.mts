/**
 * evaluateDefense — folds a Roll Defense Dialog result together with the attack card's
 * already-known attack total/critical-threat state into a final hit/miss + confirmed-crit
 * determination (poc.10 Story E, §10.7). Pure aside from the Concealment miss-chance roll
 * (a genuine d% check — can't be pre-computed by the dialog itself, since it isn't known
 * until resolution time whether Concealment even matters).
 *
 * @module
 */
import type { RollDefenseDialogResult } from '@source/rollDialogs/RollDefenseDialog/types.mjs';

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
  /** The d% roll result compared against `concealmentPercent` — `null` when no roll happened (`concealmentPercent` was 0). Mirrors D35E's `concealRoll`. */
  concealmentRoll: number | null;
  /** The miss-chance percent the roll was checked against (max of the dialog's entry and the target's base concealment) — mirrors D35E's `concealTarget`. `0` when no concealment applies. */
  concealmentPercent: number;
  /** Every named contributor to `effectiveAc` (granular Base AC breakdown first — same fidelity as the dialog's own AC tooltip — then checked combat modifiers/cover/situational) — mirrors D35E's `damage-description.html` "AC Details" table (`acModifiers`). Empty in `noCheck` mode. */
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
  dialogResult: RollDefenseDialogResult
): Promise<DefenseEvaluation> {
  if (dialogResult.checkMode === 'noCheck') {
    return {
      hit: true,
      criticalHit: isCriticalThreat && !dialogResult.ignoreCriticalHit,
      attackTotal,
      effectiveAc: 0,
      concealmentMissed: false,
      concealmentRoll: null,
      concealmentPercent: 0,
      acBreakdown: [],
    };
  }

  const acBreakdown = dialogResult.finalModifiers;
  const effectiveAc = acBreakdown.filter(mod => !mod.isIgnored).reduce((sum, mod) => sum + mod.value, 0);
  const concealmentPercent = dialogResult.concealment;
  let concealmentMissed = false;
  let concealmentRoll: number | null = null;
  if (concealmentPercent > 0) {
    const roll = await new Roll('1d100').evaluate();
    concealmentRoll = roll.total ?? 0;
    concealmentMissed = concealmentRoll <= concealmentPercent;
  }

  const hit = attackTotal >= effectiveAc && !concealmentMissed;
  const criticalHit = hit
    && isCriticalThreat
    && !dialogResult.ignoreCriticalHit
    && critConfirmTotal !== null
    && critConfirmTotal >= effectiveAc;

  return { hit, criticalHit, attackTotal, effectiveAc, concealmentMissed, concealmentRoll, concealmentPercent, acBreakdown };
}

export { evaluateDefense };
export type { DefenseEvaluation };
