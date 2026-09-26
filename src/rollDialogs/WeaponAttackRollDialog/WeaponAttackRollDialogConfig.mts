/**
 * Shared abstract base for the weapon-attack roll dialogs (poc.10 Story D refactor).
 * `MeleeAttackRollDialogConfig`/`RangedAttackRollDialogConfig` extend this rather than
 * `useRollDialogConfigBase()` directly, purely to name the "weapon attack" dialog family —
 * there is no standalone dialog instantiated from this class itself. Ranged supplies its
 * own wider `TData`/`TResult` (adds ammo); Melee uses the defaults.
 */
import { useRollDialogConfigBase } from '../RollDialog/RollDialogConfigBase.mjs';
import type { WeaponAttackRollDialogData, WeaponAttackRollDialogResult } from './types.mjs';

const WEAPON_ATTACK_ROLL_DIALOG_CLASS = 'weapon-attack-roll-dialog';

function useWeaponAttackRollDialogConfig<
  TData extends WeaponAttackRollDialogData = WeaponAttackRollDialogData,
  TResult extends WeaponAttackRollDialogResult = WeaponAttackRollDialogResult
>() {
  abstract class WeaponAttackRollDialogConfig extends useRollDialogConfigBase<TData, TResult>() {
    static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
      super.DEFAULT_OPTIONS,
      {
        classes: [
          ...super.DEFAULT_OPTIONS.classes,
          WEAPON_ATTACK_ROLL_DIALOG_CLASS,
        ],
        position: {
          width: 666,
          height: 550,
        },
      },
      { inplace: false }
    );
  }

  return WeaponAttackRollDialogConfig;
}

export {
  useWeaponAttackRollDialogConfig,
  WEAPON_ATTACK_ROLL_DIALOG_CLASS,
};
