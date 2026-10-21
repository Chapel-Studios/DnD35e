import type { AbilityKey } from '@constants/abilities.mjs';
import type { WieldedHand } from '@constants/equipmentSlots.mjs';
import type { ActionResult, UseActionContext } from '@items/baseItem/actions/types.mjs';

interface UseWeaponAttackContext extends UseActionContext {
  /** Which hand(s) this attack draws BAB/STR-scaling from — derived live via `detectHand()`, never authored. Seeds both the dialog's Wield Mode toggle and its WieldedHand-select override. */
  wieldedHand: WieldedHand;
  attackAbility: AbilityKey;
  /** Ability the STR-scaling damage term uses — independent of `attackAbility` (finesse swaps only the attack roll's ability, never damage's). Always STR under current SRD weapon properties. */
  damageAbility: AbilityKey;
  availableBab: number;
  /** Raw BAB pool for each hand (main/off/both), snapshotted once in `PrepareActionContext` — feeds the dialog's live per-hand preview and the post-dialog `availableBab` refresh when the player overrides Wield Mode. */
  handBab: Record<WieldedHand, number>;
  isFree: boolean;
  damageSituationalModifier: string;  // formula
  attackSituationalModifier: string;  // formula
}

/**
 * `executeAction()`/`continueAction()` result for weapon-attack actions (§10.7). Hit/miss
 * resolution itself stays a Story E concern (`_continue()`'s real body).
 */
interface WeaponAttackActionResult extends ActionResult {
  /** The attack roll's total, once one has actually been rolled (poc.10 Story D). */
  attackTotal?: number;
  /** Set from the dialog's Non-lethal toggle — which HP bucket a later hit should target (Story E). */
  nonLethal?: boolean;
  /** The dialog's final resolved hand — `useAction()` spends BAB from this, not the pre-dialog auto-detected hand. */
  finalHand?: WieldedHand;
  /** The posted attack card, once one exists — lets `useAction()` patch its `actionEconomySpent` flag in after spending (poc.10 Story D, §10.8). */
  attackMessage?: ChatMessage;
  /** Final hit/miss, once `_continue()`'s `'damage'` case has resolved a target row (Story E). */
  hit?: boolean;
  /** Whether the resolved hit was a confirmed critical (Story E). */
  criticalHit?: boolean;
}

export type { UseWeaponAttackContext, WeaponAttackActionResult };
