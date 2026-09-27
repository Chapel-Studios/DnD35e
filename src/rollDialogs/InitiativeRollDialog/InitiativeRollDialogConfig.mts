/**
 * Vue-based initiative roll dialog (poc.10 Story D refactor) — a branded sibling of
 * `SavingThrowRollDialogConfig` with no extra fields today; kept as
 * its own dialog type (not shared with saves) since the set of actors that can roll
 * initiative may diverge from the set with saving throws. See `InitiativeRollDialogStore`'s
 * doc for the rationale.
 */
import type { Component } from 'vue';

import { useRollDialogConfigBase } from '../RollDialog/RollDialogConfigBase.mjs';
import InitiativeRollDialog from './InitiativeRollDialog.vue';
import type { InitiativeRollDialogData, InitiativeRollDialogResult } from './types.mts';

const INITIATIVE_ROLL_DIALOG_CLASS = 'initiative-roll-dialog';

class InitiativeRollDialogConfig extends useRollDialogConfigBase<InitiativeRollDialogData, InitiativeRollDialogResult>() {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      // `{id}` substituted with a per-instance uniqueId — lets any number of these dialogs
      // (and attack/other roll dialogs) stay open simultaneously. See RollDialogConfigBase.
      id: 'dnd35e-initiative-roll-dialog-{id}',
      classes: [
        ...super.DEFAULT_OPTIONS.classes,
        INITIATIVE_ROLL_DIALOG_CLASS,
      ],
    },
    { inplace: false }
  );

  protected override get vueComponent(): Component {
    return InitiativeRollDialog;
  }

  /**
   * Open the dialog and resolve once the user rolls, cancels, or closes it.
   */
  static async roll(data: InitiativeRollDialogData): Promise<InitiativeRollDialogResult | null> {
    const dialog = new InitiativeRollDialogConfig(data);
    void dialog.render(true);
    return dialog.resultPromise;
  }
}

export {
  INITIATIVE_ROLL_DIALOG_CLASS,
  InitiativeRollDialogConfig,
};
