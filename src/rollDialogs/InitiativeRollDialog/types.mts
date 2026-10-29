import type { RollModifier } from '@source/dice/index.mjs';

import type { RollBreakdownData, RollDialogContext, RollDialogData, RollDialogResult } from '../RollDialog/types.mjs';

/**
 * A standalone dialog type (poc.10 Story D refactor), deliberately NOT shared with
 * `SavingThrowRollDialog` even though the two are structurally identical today — the set of
 * actors that can roll initiative may diverge from the set with saving throws as the system
 * grows (e.g. hazards/vehicles), so keeping them as separate types avoids baking that
 * coincidence into the type system.
 */
interface InitiativeRollDialogData extends RollDialogData {
  initRoll: RollBreakdownData;
}

interface InitiativeRollDialogResult extends RollDialogResult {
  /** The before-roll-resolved situational-modifier formula */
  // 
  finalModifiers: RollModifier[];
}

interface InitiativeRollDialogContext extends RollDialogContext<InitiativeRollDialogData, InitiativeRollDialogResult> {
}

export type {
  InitiativeRollDialogContext,
  InitiativeRollDialogData,
  InitiativeRollDialogResult,
};
