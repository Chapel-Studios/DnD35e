import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import type { WieldedHand } from '@constants/equipmentSlots.mjs';
import type { ActionDataModel } from '@items/baseItem/actions/ActionDataModel.mjs';
import type { Weapon } from '@items/physical/weapon/Weapon.mjs';

import type { MeleeAttackRollDialogResult } from '../MeleeAttackRollDialog/types.mjs';
import type { RangedAttackRollDialogResult } from '../RangedAttackRollDialog/types.mjs';
import type { RollDialogData, RollDialogResult } from '../RollDialog/types.mjs';

/**
 * A single attack-roll combat modifier (poc.10 Story D, §10.7) — Attack Type
 * (charge/defensiveFighting/nonLethal) and Combat Status (flanking/highGround/squeezing/
 * prone/proficient) toggles share this shape. `label`/`tooltip` are already localized by
 * the caller (`executeAction()`), same convention as `RollDialogData.title`/`baseLabel`.
 * `checked`'s effect on `value` is inverted for `proficient` — see §10.7's Proficient row —
 * `executeAction()` reads that toggle's `checked` state directly rather than folding its
 * `value` into the generic sum.
 */
interface CombatModifierToggle {
  id: string;
  group: 'attackType' | 'combatStatus';
  label: string;
  tooltip: string;
  value: number;
  checked: boolean;
  /** Whether this toggle's initial `checked` state came from geometry/status detection vs. a fixed default. */
  autoDetected: boolean;
}

interface WeaponAttackRollDialogData extends RollDialogData {
  target: ACTORS_DND35E[] | null;
  /**
   * The weapon making the attack (poc.10 Story D) — additional FormulaFamiliar context
   * (`#item`/`#weapon`) for `attackSituationalModifier`/`damageSituationalModifier`,
   * mirroring `WeaponAttackDataModel._executeCheck()`'s own `formulaContext`.
   */
  item: Weapon;
  /**
   * This attack's own action DataModel (poc.10 Story D) — additional FormulaFamiliar
   * context (`#thisAttack`, e.g. `$scaleDamage(...)`) for the situational modifier formulas.
   */
  thisAttack: ActionDataModel;
  /**
   * A formula folded into the attack roll only (poc.10 Story D) — the weapon-attack
   * dialogs' analog of `SavingThrowRollDialogData.situationalModifier`, renamed to
   * disambiguate from `damageSituationalModifier` below.
   */
  attackSituationalModifier: string;
  /**
   * Attack-roll-only combat modifiers (poc.10 Story D) — undefined for saves/initiative.
   * Round-trips through `WeaponAttackRollDialogResult` with each toggle's final `checked` state.
   */
  combatModifierToggles: CombatModifierToggle[];
  /**
   * A formula field folded only into the resolved damage formula once damage is actually
   * rolled — never into the attack roll itself (poc.10 Story D, §10.7). Undefined for
   * saves/initiative.
   */
  damageSituationalModifier?: string;
  /** Wield Mode (poc.10 Story D, §10.3) — auto-filled by `detectHand()`, always overridable. */
  // wieldMode?: WieldedHand;
  /** WieldedHand select (poc.10 Story D, §10.3) — auto-filled, always overridable. */
  wieldModeFromEquippedSlots: WieldedHand;
  /** Damage box's base-row label (poc.10 Story D) — mirrors `RollDialogData.baseLabel`'s convention, but damage-specific since only weapon attacks have a damage preview row. */
  damageLabel: string;
  /** Damage box's base-row total (poc.10 Story D) — pre-dialog flat preview (dice terms excluded, see `resolveFormulaNumber`'s doc), mirrors `RollDialogData.baseTotal`. */
  damageTotal: number;
}

interface WeaponAttackRollDialogResult extends RollDialogResult {
  /**
   * The resolved `WeaponAttackRollDialogData.attackSituationalModifier` term (dice terms kept
   * intact, e.g. `1d6`), combined with any checked combat-modifier toggles' flat sum.
   */
  attackSituationalModifier: string;
  /** Present only when `WeaponAttackRollDialogData.combatModifiers` was provided — see that field's doc. */
  combatModifiers: CombatModifierToggle[];
  /**
   * The resolved damage-situational formula (FormulaFamiliar tokens replaced, dice terms kept
   * intact for later evaluation) — present only when `WeaponAttackRollDialogData.damageSituationalModifier` was provided.
   */
  damageSituationalModifier: string;
  wieldMode: WieldedHand;
}

type AttackRollDialogResult = MeleeAttackRollDialogResult | RangedAttackRollDialogResult;

export type {
  AttackRollDialogResult,
  CombatModifierToggle,
  WeaponAttackRollDialogData,
  WeaponAttackRollDialogResult,
};
