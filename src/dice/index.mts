/**
 * Public barrel for the dice module — roll engines (`D20Roll`/`DamageRoll`), formula
 * assembly, chat cards, and roll dialogs.
 *
 * @module
 */
import type { ItemActionSpentCardFlags } from './chatCards/actionSpentCard/actionSpentCard.mjs';
import { buildItemActionSpentCard } from './chatCards/actionSpentCard/actionSpentCard.mjs';
import { buildActionEconomyWarningCard } from './chatCards/actionWarningCard/actionWarningCard.mjs';
import { buildActionChainId, parseActionChainId } from './chatCards/attackRollCard/actionChainSteps.mjs';
import type { AttackCardFlags, AttackCardTargetRow } from './chatCards/attackRollCard/attackRollCard.mjs';
import { buildAttackCard } from './chatCards/attackRollCard/attackRollCard.mjs';
import type { MoveActionCardData, MoveActionCardFlags } from './chatCards/moveActionCard/moveActionCard.mjs';
import { buildMoveActionCard, buildMoveActionCardContent, upsertMoveActionCard } from './chatCards/moveActionCard/moveActionCard.mjs';
import type { ProneToggleCardFlags } from './chatCards/proneToggleCard/proneToggleCard.mjs';
import { buildProneToggleCard, buildProneToggleCardContent } from './chatCards/proneToggleCard/proneToggleCard.mjs';
import { registerChatCardActions } from './chatCards/registerChatCardActions.mjs';
import { buildInitiativeCard, buildSaveCard } from './chatCards/saveRollCard/saveRollCard.mjs';
import { buildD20Formula, extractFlatModifier, flavorTerm } from './d20Formula.mjs';
import { D20Roll } from './D20Roll.mjs';
import { DamageRoll } from './DamageRoll.mjs';
import type { RollModifier } from './types.mjs';

export {
  buildActionChainId,
  buildActionEconomyWarningCard,
  buildAttackCard,
  buildD20Formula,
  buildInitiativeCard,
  buildItemActionSpentCard,
  buildMoveActionCard,
  buildMoveActionCardContent,
  buildProneToggleCard,
  buildProneToggleCardContent,
  buildSaveCard,
  D20Roll,
  DamageRoll,
  extractFlatModifier,
  flavorTerm,
  parseActionChainId,
  registerChatCardActions,
  upsertMoveActionCard,
};
export type {
  AttackCardFlags,
  AttackCardTargetRow,
  ItemActionSpentCardFlags,
  MoveActionCardData,
  MoveActionCardFlags,
  ProneToggleCardFlags,
  RollModifier,
};


