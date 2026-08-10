/**
 * Vue-based D20 roll dialog — situational modifier + roll mode, used by any d20 check
 * (saves, ability checks, attack rolls). See phase-07-roll-formulas.md §7.9.
 */
import { ROLL_DIALOG_CLASS, VUE_APP_CLASS } from '@constants/cssClasses.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import { useVueDialogMixin } from '@vueApps/VueDialogMixin.mjs';
import type { Component } from 'vue';

import D20RollDialogApp from './D20RollDialogApp.vue';

/** Input data for the D20 roll dialog. */
interface D20RollDialogData {
  /** Already-localized dialog title, e.g. "Roll Fortitude Save". */
  title: string;
  /** Already-localized label for the base total row, e.g. "Fortitude". */
  baseLabel: string;
  /** The actor's current computed value for the stat being rolled. */
  baseTotal: number;
  situationalModifier: number;
  rollMode: string;
  actorName: string;
  actorImage: string;
}

/** Result returned when the user confirms the roll. */
interface D20RollDialogResult {
  situationalModifier: number;
  rollMode: string;
}

const { ApplicationV2 } = foundry.applications.api;

const VueDialogBase = useVueDialogMixin<typeof ApplicationV2, D20RollDialogData, D20RollDialogResult>(ApplicationV2);

class D20RollDialogConfig extends VueDialogBase {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: 'dnd35e-d20-roll-dialog',
      tag: 'div',
      classes: [SYSTEM_ID, VUE_APP_CLASS, ROLL_DIALOG_CLASS],
      position: {
        width: 360,
        height: 'auto',
      },
      window: {
        icon: 'fas fa-dice-d20',
        resizable: false,
      },
    },
    { inplace: false }
  );

  constructor(data: D20RollDialogData) {
    super();
    this.options.window.title = data.title;
    this.initializeReactiveData(data);
  }

  protected override get vueComponent(): Component {
    return D20RollDialogApp;
  }

  /**
   * Open the dialog and resolve once the user rolls, cancels, or closes it.
   */
  static async roll(data: D20RollDialogData): Promise<D20RollDialogResult | null> {
    const dialog = new D20RollDialogConfig(data);
    void dialog.render(true);
    return dialog.resultPromise;
  }
}

export { D20RollDialogConfig };
export type { D20RollDialogData, D20RollDialogResult };
