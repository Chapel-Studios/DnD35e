import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';
import type { RollModifier } from '@source/dice/types.mjs';

import type { RollBreakdownData, RollDialogData, RollDialogResult } from '../RollDialog/types.mjs';

interface DefenseModifierToggle {
  id: string;
  group: 'combatStatus' | 'overrides';
  label: string;
  tooltip: string;
  value: number;
  checked: boolean;
  autoDetected: boolean;
}

const NOT_COVERED = 'none';
const COVERED = 'covered';
const IMPROVED_COVER = 'improvedCover';
const ALL_COVERED_STATES = [NOT_COVERED, COVERED, IMPROVED_COVER] as const;
const COVERED_STATES = { NONE: NOT_COVERED, COVERED, IMPROVED: IMPROVED_COVER } as const;
type CoveredState = typeof ALL_COVERED_STATES[number];
const COVER_AC_BONUS: Record<CoveredState, number> = {
  [NOT_COVERED]: 0, [COVERED]: 4, [IMPROVED_COVER]: 8,
};
type CheckMode = 'normal' | 'touch' | 'noCheck';

interface RollDefenseDialogData extends RollDialogData {
  attacker: ACTORS_DND35E;
  attackerToken?: TokenDnd35e | null;
  combatModifierToggles: DefenseModifierToggle[];
  /** The state which produced the prepared AC, for checkbox reconciliation. */
  defenderDenyDexToAC: boolean;
  defenderDexMod: number;
  concealment: string;
  covered: CoveredState;
  situationalModifier: string;
  checkMode: CheckMode;
  defenseRollByMode: Record<Exclude<CheckMode, 'noCheck'>, RollBreakdownData>;
  damageLabel: string;
  damageTotalFormula: string;
  damageModifierList: RollModifier[];
}

interface RollDefenseDialogResult extends RollDialogResult {
  finalModifiers: RollModifier[];
  checkMode: CheckMode;
  /** Final 0-100 miss chance, including the defender's prepared concealment. */
  concealment: number;
  applyHalfDamage: boolean;
  ignoreCriticalHit: boolean;
}

export type { CheckMode, CoveredState, DefenseModifierToggle, RollDefenseDialogData, RollDefenseDialogResult };
export { ALL_COVERED_STATES, COVER_AC_BONUS, COVERED, COVERED_STATES, IMPROVED_COVER, NOT_COVERED };
