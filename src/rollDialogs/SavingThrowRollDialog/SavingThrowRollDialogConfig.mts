/**
 * Vue-based saving throw roll dialog (poc.10 Story D refactor) — a branded
 * sibling of `InitiativeRollDialogConfig` with no extra fields; see that class's doc for the shared
 * shape/rationale.
 */
import type { Component } from 'vue';

import { useRollDialogConfigBase } from '../RollDialog/RollDialogConfigBase.mjs';
import SavingThrowRollDialog from './SavingThrowRollDialog.vue';
import type { SavingThrowRollDialogData, SavingThrowRollDialogResult } from './types.mts';

const SAVING_THROW_ROLL_DIALOG_CLASS = 'saving-throw-roll-dialog';

class SavingThrowRollDialogConfig extends useRollDialogConfigBase<SavingThrowRollDialogData, SavingThrowRollDialogResult>() {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      // `{id}` substituted with a per-instance uniqueId — lets any number of these dialogs
      // (and attack/other roll dialogs) stay open simultaneously. See RollDialogConfigBase.
      id: 'dnd35e-saving-throw-roll-dialog-{id}',
      classes: [
        ...super.DEFAULT_OPTIONS.classes,
        SAVING_THROW_ROLL_DIALOG_CLASS,
      ],
    },
    { inplace: false }
  );

  protected override get vueComponent(): Component {
    return SavingThrowRollDialog;
  }

  /**
   * Open the dialog and resolve once the user rolls, cancels, or closes it.
   */
  static async roll(data: SavingThrowRollDialogData): Promise<SavingThrowRollDialogResult | null> {
    const dialog = new SavingThrowRollDialogConfig(data);
    void dialog.render(true);
    return dialog.resultPromise;
  }
}

export { 
  SAVING_THROW_ROLL_DIALOG_CLASS,
  SavingThrowRollDialogConfig,
};
