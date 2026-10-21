import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';
import type { RollModifier } from '@source/dice/index.mjs';

import type { RollDialogData, RollDialogResult } from '../RollDialog/types.mjs';
import type { CombatModifierToggle } from '../WeaponAttackRollDialog/types.mjs';

/** Covered / Improved Cover toggle value (poc.10 Story E, §10.7) — a 3-way `MultiOptionToggle`, mutually exclusive by construction (not two independent checkboxes). */
const NOT_COVERED = 'none';
const COVERED = 'covered';
const IMPROVED_COVER = 'improvedCover';
const ALL_COVERED_STATES = [NOT_COVERED, COVERED, IMPROVED_COVER] as const;
const COVERED_STATES = {
  NONE: NOT_COVERED,
  COVERED,
  IMPROVED: IMPROVED_COVER,
} as const;
type CoveredState = typeof ALL_COVERED_STATES[number];

/** AC bonus granted by each `CoveredState` (§10.7's Covered/Improved Cover row) — `evaluateDefense()` (later Story E task) reuses this same map. */
const COVER_AC_BONUS: Record<CoveredState, number> = {
  [NOT_COVERED]: 0,
  [COVERED]: 4,
  [IMPROVED_COVER]: 8,
};

/** Normal/Touch/No Check toggle value (§10.7's "Check mode" row) — Flat-Footed lives in Combat Status instead, since it's a condition, not a roll mode. */
type CheckMode = 'normal' | 'touch' | 'noCheck';

interface RollDefenseDialogData extends RollDialogData {
  /**
   * The attacker whose attack this defense resolves against — shown in the secondary
   * header slot (mirrors `WeaponAttackRollDialogData.target`, reversed: here the base
   * `actor` field is the *defender*). Caller must `markRaw()` this before passing it in,
   * same convention as `WeaponAttackRollDialogData.item`/`thisAttack`.
   */
  attacker: ACTORS_DND35E;
  attackerToken?: TokenDnd35e | null;
  /** Combat Status + Overrides toggles (§10.7) — `combatStatus`/`overrides` groups only, no `attackType` group on this dialog. */
  combatModifierToggles: CombatModifierToggle[];
  /**
   * Whether the real Flat-Footed condition (or similar) already denies Dex to AC at the
   * moment this dialog was built — `baseTotalByMode` already reflects this. Compared against
   * the `flatFooted` toggle's checked state (`RollDefenseDialogStore`) to decide whether a
   * live Dex add/remove adjustment is needed: GM manually checking the box (target not
   * actually flat-footed) subtracts `defenderDexMod`; manually unchecking it (target IS
   * flat-footed) adds it back, e.g. an Uncanny-Dodge-style override for this one roll.
   */
  defenderDenyDexToAC: boolean;
  /** Defender's Dex modifier to AC — same source `_buildDefenseChanges()` uses, so the live adjustment above matches exactly what the real AC would gain/lose. */
  defenderDexMod: number;
  /** Concealment formula field (§10.7) — blank/0 by default; resolved to a flat 0–100 percentage on submit, the miss-chance roll itself happens later in `evaluateDefense()`. */
  concealment: string;
  /** Covered / Improved Cover 3-way toggle (§10.7). */
  covered: CoveredState;
  /**
   * Situational Bonus formula field (§10.7) — contexts `defender` (preferred autocomplete
   * term) and `self`/`attacker`. `self` always resolves too (`buildDocumentFamiliar`'s
   * literal `self` key never goes away) — `defender` is the caller-supplied preferred
   * alias set in `RollDefenseDialogStore.mts`.
   */
  situationalModifier: string;
  /** Normal/Touch/No Check 3-way toggle (§10.7). */
  checkMode: CheckMode;
  /** AC preview per check mode — mirrors `WeaponAttackRollDialogData.baseTotalByHand`'s per-option preview shape. `noCheck` has no meaningful AC; the preview box hides itself instead (see `RollDefenseDialog.vue`). */
  baseTotalByMode: Record<Exclude<CheckMode, 'noCheck'>, number>;
  /** Labeled breakdown of `baseTotalByMode`, per mode — mirrors `RollDialogData.baseModifierList`'s convention, swapped out by `RollDefenseDialogStore`'s checkMode setter alongside `baseTotalByMode`. */
  baseModifierListByMode: Record<Exclude<CheckMode, 'noCheck'>, RollModifier[]>;
  /**
   * Damage box's label — mirrors `WeaponAttackRollDialogData.damageLabel`. Sits alongside the
   * AC box (see `RollDefenseDialog.vue`'s `subgrid`) so the defender can see what's riding on
   * this defense roll.
   */
  damageLabel: string;
  /**
   * Attacker's already-computed expected-damage preview (dice-collapsed, e.g. `2d6 + 7`) —
   * sourced from the attack card's `expectedDamageFormula` flag (`attackRollCard.mts`), since
   * the defense dialog never recomputes damage itself; this is purely informational/static,
   * unlike the Attack dialog's twin which stays live against a situational-modifier field.
   */
  damageTotalFormula: string;
  /** Labeled breakdown backing `damageTotalFormula` — sourced from the attack card's `expectedDamageModifierList` flag, same static convention. */
  damageModifierList: RollModifier[];
}

interface RollDefenseDialogResult extends RollDialogResult {
  checkMode: CheckMode;
  /** Resolved flat percentage (0–100, FormulaFamiliar-substituted) — the actual d% miss-chance roll happens later, in `evaluateDefense()`. */
  concealment: number;
  covered: CoveredState;
  /** Final checked states of every Combat Status + Overrides toggle — mirrors `WeaponAttackRollDialogResult.combatModifiers`. */
  combatModifiers: CombatModifierToggle[];
  situationalModifier: string;
  /** Read directly off the `applyHalfDamage` toggle rather than folded into `combatModifiers`' checked-sum (mirrors the Attack dialog's `nonLethal`/`proficient` convention). */
  applyHalfDamage: boolean;
  /** Read directly off the `ignoreCriticalHit` toggle, same convention as `applyHalfDamage`. */
  ignoreCriticalHit: boolean;
  /** Passthrough of `RollDefenseDialogData.defenderDenyDexToAC` — lets `evaluateDefense()` reconcile the `flatFooted` toggle against the real baked-in condition the same way `RollDefenseDialogStore`'s live preview does, instead of silently dropping the Dex adjustment once the dialog resolves. */
  defenderDenyDexToAC: boolean;
  /** Passthrough of `RollDefenseDialogData.defenderDexMod`, same reason as `defenderDenyDexToAC`. */
  defenderDexMod: number;
  /** The resolved check mode's granular Base AC breakdown (`RollDefenseDialogData.baseModifierListByMode`, already mode-selected) — lets `evaluateDefense()` show the same Base/Size/Dex/Armor/Shield/Natural fidelity on the resolution card as the dialog's own AC tooltip, not a single lumped "Base AC" line. */
  baseModifierList: RollModifier[];
}

export type {
  CheckMode,
  CoveredState,
  RollDefenseDialogData,
  RollDefenseDialogResult,
};
export {
  ALL_COVERED_STATES,
  COVER_AC_BONUS,
  COVERED,
  COVERED_STATES,
  IMPROVED_COVER,
  NOT_COVERED,
};
