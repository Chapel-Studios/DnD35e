import type { WieldMode } from '@actors/baseActor/ActorDnd35e.mjs';
import type { AbilityKey } from '@constants/abilities.mjs';
import type { ActionResult, UseActionContext } from '@items/baseItem/actions/types.mjs';

interface UseWeaponAttackContext extends UseActionContext {
  /** Which hand(s) this attack draws BAB from — derived live via `wieldModeToBabHand(detectWieldMode(...))`, never authored. */
  hand: 'main' | 'off' | 'both';
  /** Initial Wield Mode shown in the Attack Roll Dialog's override — derived via `detectWieldMode()`, always user-overridable there. */
  wieldMode: WieldMode;
  attackAbility: AbilityKey;
  availableBab: number;
}

/**
 * `executeAction()`/`continue()` result for weapon-attack actions (§10.7). Hit/miss
 * resolution itself stays a Story E concern (`continue()`'s real body).
 */
interface WeaponAttackActionResult extends ActionResult {
  /** The attack roll's total, once one has actually been rolled (poc.10 Story D). */
  attackTotal?: number;
  /** Set from the dialog's Non-lethal toggle — which HP bucket a later hit should target (Story E). */
  nonLethal?: boolean;
  /** The dialog's final resolved hand/wield-mode pool — `useAction()` spends BAB from this, not the pre-dialog auto-detected hand. */
  finalHand?: 'main' | 'off' | 'both';
  /** The posted attack card, once one exists — lets `useAction()` patch its `actionEconomySpent` flag in after spending (poc.10 Story D, §10.8). */
  attackMessage?: ChatMessage;
}

export type { UseWeaponAttackContext, WeaponAttackActionResult };
