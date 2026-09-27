import type { WeaponAttackRollDialogData, WeaponAttackRollDialogResult } from '../WeaponAttackRollDialog/types.mts';
/** An ammo option available for the acting action's `range.ammoType` — populated by Story F. */
interface AmmoOption {
  itemUuid: string;
  name: string;
}

interface RangedAttackRollDialogData extends WeaponAttackRollDialogData {
  /** Reserved Ammo select slot (poc.10 Story D/F) — populated by Story F; empty/undefined hides the field. */
  ammoOptions?: AmmoOption[];
  ammo?: string | null;
}

interface RangedAttackRollDialogResult extends WeaponAttackRollDialogResult {
  /** The selected ammo for the ranged attack — present only when `RangedAttackRollDialogData.ammoOptions` was provided. */
  ammo?: string | null;
}

export type {
  AmmoOption,
  RangedAttackRollDialogData,
  RangedAttackRollDialogResult,
};
