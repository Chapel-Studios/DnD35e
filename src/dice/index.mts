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
import { advanceActionChain, appendAttackCardWarnings, buildAttackCard, buildAttackCardContent, markTargetRowResolved } from './chatCards/attackRollCard/attackRollCard.mjs';
import type { MoveActionCardData, MoveActionCardFlags } from './chatCards/moveActionCard/moveActionCard.mjs';
import { buildMoveActionCard, buildMoveActionCardContent, upsertMoveActionCard } from './chatCards/moveActionCard/moveActionCard.mjs';
import type { ProneToggleCardFlags } from './chatCards/proneToggleCard/proneToggleCard.mjs';
import { buildProneToggleCard, buildProneToggleCardContent } from './chatCards/proneToggleCard/proneToggleCard.mjs';
import { registerChatCardActions } from './chatCards/registerChatCardActions.mjs';
import type { ResolutionCardData, ResolutionCardFlags } from './chatCards/resolutionCard/resolutionCard.mjs';
import { buildResolutionCard, wireResolutionCardButton } from './chatCards/resolutionCard/resolutionCard.mjs';
import { buildInitiativeCard, buildSaveCard } from './chatCards/saveRollCard/saveRollCard.mjs';
import { buildD20Formula, combineDiceFormula, extractDiceOnlyFormula, extractFlatModifier, flavorDamageDiceBySource, flavorDiceGroups, flavorTerm, groupDamageDiceBySource } from './d20Formula.mjs';
import { D20Roll } from './D20Roll.mjs';
import { DamageRoll } from './DamageRoll.mjs';
import { buildOverridesModifierList, buildSituationalModifierEntry, reconcileBakedConditionEntry, reconcileFlatFootedDexEntry } from './rollModifierBreakdown.mjs';
import type { RollModifier } from './types.mjs';

export {
  advanceActionChain,
  appendAttackCardWarnings,
  buildActionChainId,
  buildActionEconomyWarningCard,
  buildAttackCard,
  buildAttackCardContent,
  buildD20Formula,
  buildInitiativeCard,
  buildItemActionSpentCard,
  buildMoveActionCard,
  buildMoveActionCardContent,
  buildOverridesModifierList,
  buildProneToggleCard,
  buildProneToggleCardContent,
  buildResolutionCard,
  buildSaveCard,
  buildSituationalModifierEntry,
  combineDiceFormula,
  D20Roll,
  DamageRoll,
  extractDiceOnlyFormula,
  extractFlatModifier,
  flavorDamageDiceBySource,
  flavorDiceGroups,
  flavorTerm,
  groupDamageDiceBySource,
  markTargetRowResolved,
  parseActionChainId,
  reconcileBakedConditionEntry,
  reconcileFlatFootedDexEntry,
  registerChatCardActions,
  upsertMoveActionCard,
  wireResolutionCardButton,
};
export type {
  AttackCardFlags,
  AttackCardTargetRow,
  ItemActionSpentCardFlags,
  MoveActionCardData,
  MoveActionCardFlags,
  ProneToggleCardFlags,
  ResolutionCardData,
  ResolutionCardFlags,
  RollModifier,
};


