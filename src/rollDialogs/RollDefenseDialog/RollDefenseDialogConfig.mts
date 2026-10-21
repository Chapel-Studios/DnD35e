/**
 * Vue-based Roll Defense Dialog (poc.10 Story E, §10.7) — the defender-side counterpart to
 * the Attack Roll Dialog, opened from `ActionDataModel#continue()`'s `'damage'` step (a
 * later Story E task; this dialog is standalone/not yet wired to a caller).
 */
import type { Component } from 'vue';

import { useRollDialogConfigBase } from '../RollDialog/RollDialogConfigBase.mjs';
import RollDefenseDialog from './RollDefenseDialog.vue';
import type { RollDefenseDialogData, RollDefenseDialogResult } from './types.mts';

const ROLL_DEFENSE_DIALOG_CLASS = 'roll-defense-roll-dialog';

class RollDefenseDialogConfig extends useRollDialogConfigBase<RollDefenseDialogData, RollDefenseDialogResult>() {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      // `{id}` substituted with a per-instance uniqueId — see RollDialogConfigBase's doc.
      id: 'dnd35e-roll-defense-roll-dialog-{id}',
      classes: [
        ...super.DEFAULT_OPTIONS.classes,
        ROLL_DEFENSE_DIALOG_CLASS,
      ],
      position: {
        width: 666,
        height: 'auto',
      },
    },
    { inplace: false }
  );

  protected override get vueComponent(): Component {
    return RollDefenseDialog;
  }

  /**
   * Open the dialog and resolve once the user submits, cancels, or closes it.
   */
  static async roll(data: RollDefenseDialogData): Promise<RollDefenseDialogResult | null> {
    const dialog = new RollDefenseDialogConfig(data);
    void dialog.render(true);
    return dialog.resultPromise;
  }
}

export {
  ROLL_DEFENSE_DIALOG_CLASS,
  RollDefenseDialogConfig,
};
