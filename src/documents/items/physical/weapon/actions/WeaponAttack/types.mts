import type { AbilityKey } from '@constants/abilities.mjs';
import type { ActionResult, UseActionContext } from '@items/baseItem/actions/types.mjs';

interface UseWeaponAttackContext extends UseActionContext {
  /** Which hand(s) this attack draws BAB from — derived live via `wieldModeToBabHand(detectWieldMode(...))`, never authored. */
  hand: 'main' | 'off' | 'both';
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
  /** The posted attack card, once one exists — lets `useAction()` patch its `actionEconomySpent` flag in after spending (poc.10 Story D, §10.8). */
  attackMessage?: ChatMessage;
}

export type { UseWeaponAttackContext, WeaponAttackActionResult };
