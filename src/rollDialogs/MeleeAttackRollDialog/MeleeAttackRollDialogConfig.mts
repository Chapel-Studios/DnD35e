/**
 * Vue-based melee weapon attack roll dialog (poc.10 Story D refactor) — combat modifiers,
 * damage bonus, wield mode, and hand select on top of the base roll dialog. Sibling of
 * `RangedAttackRollDialogConfig`; both extend `WeaponAttackRollDialogConfig` and share
 * `WeaponAttackRollDialog.vue`'s fields and `WeaponAttackRollDialogStore`.
 */
import type { Component } from 'vue';

import type { WeaponAttackRollDialogData, WeaponAttackRollDialogResult } from '../WeaponAttackRollDialog/types.mts';
import { useWeaponAttackRollDialogConfig } from '../WeaponAttackRollDialog/WeaponAttackRollDialogConfig.mjs';
import MeleeAttackRollDialog from './MeleeAttackRollDialog.vue';

const MELEE_ATTACK_ROLL_DIALOG_CLASS = 'melee-attack-roll-dialog';

class MeleeAttackRollDialogConfig extends useWeaponAttackRollDialogConfig() {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      // `{id}` substituted with a per-instance uniqueId — lets any number of these dialogs
      // (and save/ranged/other roll dialogs) stay open simultaneously. See RollDialogConfigBase.
      id: 'dnd35e-melee-attack-roll-dialog-{id}',
      classes: [
        ...super.DEFAULT_OPTIONS.classes,
        MELEE_ATTACK_ROLL_DIALOG_CLASS,
      ],
    },
    { inplace: false }
  );

  protected override get vueComponent(): Component {
    return MeleeAttackRollDialog;
  }

  /**
   * Open the dialog and resolve once the user rolls, cancels, or closes it.
   */
  static async roll(data: WeaponAttackRollDialogData): Promise<WeaponAttackRollDialogResult | null> {
    const dialog = new MeleeAttackRollDialogConfig(data);
    void dialog.render(true);
    return dialog.resultPromise;
  }
}

export { 
  MELEE_ATTACK_ROLL_DIALOG_CLASS,
  MeleeAttackRollDialogConfig,
};
