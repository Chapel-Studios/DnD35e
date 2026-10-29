import type { RollDialogContext } from '../RollDialog/types.mjs';
import type { WeaponAttackRollDialogData, WeaponAttackRollDialogResult } from '../WeaponAttackRollDialog/types.mjs';

interface MeleeAttackRollDialogData extends WeaponAttackRollDialogData {}

interface MeleeAttackRollDialogResult extends WeaponAttackRollDialogResult {}

type MeleeAttackRollDialogContext = RollDialogContext<MeleeAttackRollDialogData, MeleeAttackRollDialogResult>;

export type {
  MeleeAttackRollDialogContext,
  MeleeAttackRollDialogData,
  MeleeAttackRollDialogResult,
};
