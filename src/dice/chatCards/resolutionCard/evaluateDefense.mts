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
import { BAKED_AC_CONDITION_IDS } from '@actors/creature/logic/defenseCombatModifiers.mjs';
import type { RollDefenseDialogResult } from '@source/rollDialogs/RollDefenseDialog/types.mjs';
import { COVER_AC_BONUS, IMPROVED_COVER } from '@source/rollDialogs/RollDefenseDialog/types.mjs';

import { extractFlatModifier } from '../../d20Formula.mjs';
import { reconcileBakedConditionEntry, reconcileFlatFootedDexEntry } from '../../rollModifierBreakdown.mjs';
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
  // Charged/Total Defense/Defensive Fighting's flat bonus is already baked into `baseAc`
  // once truly active (real condition AE) — excluded here and reconciled below instead of
  // naively summed, or the common "checkbox agrees with reality" case double-counts it.
  const checkedCombatModifiers = dialogResult.combatModifiers.filter(mod => mod.checked && mod.value !== 0 && !BAKED_AC_CONDITION_IDS.includes(mod.id as typeof BAKED_AC_CONDITION_IDS[number]));
  const combatModifierSum = checkedCombatModifiers.reduce((sum, mod) => sum + mod.value, 0);
  const coverValue = COVER_AC_BONUS[dialogResult.covered];
  // AC isn't a rolled check (barring the separate, not-yet-consumed ROLLED_DEFENSE_VARIANT house
  // rule) — only the flat portion of a dice-bearing situational modifier applies here, same
  // convention the dialog's own live AC preview already uses (`resolveFormulaNumber`).
  const situationalFlat = extractFlatModifier(dialogResult.situationalModifier).flat;
  // `flatFooted` always carries `value: 0` (see defenseCombatModifiers.mts) so it's filtered out
  // of `checkedCombatModifiers` above — its actual AC effect is this reconciliation against the
  // defender's already-baked `defenderDenyDexToAC`, shared with RollDefenseDialogStore's
  // identical live-preview reconciliation so both show the same Dex line in/out.
  const flatFootedChecked = dialogResult.combatModifiers.find(mod => mod.id === 'flatFooted')?.checked ?? false;
  const flatFootedDexAdjustment = flatFootedChecked === dialogResult.defenderDenyDexToAC
    ? 0
    : (flatFootedChecked ? -dialogResult.defenderDexMod : dialogResult.defenderDexMod);

  // Reconciles Charged/Total Defense/Defensive Fighting against the real condition the same
  // way the Dex line is reconciled against Flat-Footed — see BAKED_AC_CONDITION_IDS doc comment.
  let acBreakdown: RollModifier[] = reconcileFlatFootedDexEntry(dialogResult.baseModifierList, flatFootedChecked, dialogResult.defenderDenyDexToAC);
  let bakedConditionDelta = 0;
  for (const mod of dialogResult.combatModifiers) {
    if (!BAKED_AC_CONDITION_IDS.includes(mod.id as typeof BAKED_AC_CONDITION_IDS[number])) continue;
    const reconciled = reconcileBakedConditionEntry(acBreakdown, mod.label, mod.checked, target.statuses.has(mod.id), mod.value);
    acBreakdown = reconciled.modifierList;
    bakedConditionDelta += reconciled.delta;
  }

  const effectiveAc = baseAc + combatModifierSum + bakedConditionDelta + coverValue + situationalFlat + flatFootedDexAdjustment;

  acBreakdown = [
    ...acBreakdown,
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
