/**
 * Vue-based ranged weapon attack roll dialog (poc.10 Story D refactor) — everything
 * `MeleeAttackRollDialogConfig` has, plus an ammo select (reserved for Story F). Both
 * extend `WeaponAttackRollDialogConfig`; Ranged supplies its own wider `TData`/`TResult`
 * (adds ammo) since Melee's defaults don't include it.
 */
import type { Component } from 'vue';

import { useWeaponAttackRollDialogConfig } from '../WeaponAttackRollDialog/WeaponAttackRollDialogConfig.mjs';
import RangedAttackRollDialog from './RangedAttackRollDialog.vue';
import type { RangedAttackRollDialogData, RangedAttackRollDialogResult } from './types.mts';

class RangedAttackRollDialogConfig extends useWeaponAttackRollDialogConfig<RangedAttackRollDialogData, RangedAttackRollDialogResult>() {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      // `{id}` substituted with a per-instance uniqueId — lets any number of these dialogs
      // (and save/melee/other roll dialogs) stay open simultaneously. See RollDialogConfigBase.
      id: 'dnd35e-ranged-attack-roll-dialog-{id}',
    },
    { inplace: false }
  );

  protected override get vueComponent(): Component {
    return RangedAttackRollDialog;
  }

  /**
   * Open the dialog and resolve once the user rolls, cancels, or closes it.
   */
  static async roll(data: RangedAttackRollDialogData): Promise<RangedAttackRollDialogResult | null> {
    const dialog = new RangedAttackRollDialogConfig(data);
    void dialog.render(true);
    return dialog.resultPromise;
  }
}

export { RangedAttackRollDialogConfig };
