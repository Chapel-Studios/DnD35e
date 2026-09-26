/**
 * Shared ApplicationV2 mixin for every roll dialog Config (poc.10 Story D refactor) — holds
 * the common window shape (tag/classes/position/icon/resizable) and the title/reactive-data
 * wiring every concrete dialog repeats. A factory function, not a directly-generic class —
 * TS forbids an `extends` clause from referencing its own class's type parameters, so this
 * mirrors `useVueDialogMixin`'s factory-function convention instead. Concrete leaf Configs
 * only need to override `DEFAULT_OPTIONS.id` (per-type uniqueId — see that field's doc
 * below) and implement `vueComponent`; `static roll()` stays on each leaf class since TS
 * forbids static members from referencing class type parameters too.
 */
import { ROLL_DIALOG_CLASS, VUE_APP_CLASS } from '@constants/cssClasses.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import { useVueDialogMixin } from '@vueApps/VueDialogMixin.mjs';
import { markRaw } from 'vue';

import type { RollDialogData, RollDialogResult } from './types.mjs';

function useRollDialogConfigBase<TData extends RollDialogData, TResult extends RollDialogResult>() {
  const { ApplicationV2 } = foundry.applications.api;

  abstract class RollDialogConfigBase extends useVueDialogMixin<typeof ApplicationV2, TData, TResult>(ApplicationV2) {
    constructor(data: TData) {
      super();
      this.options.window.title = data.title;
      // `actor` is a live Foundry Document — never let Vue's reactive() wrap it (Documents
      // have private class fields/complex internal state that break under a reactive Proxy).
      this.initializeReactiveData({
        ...data,
        actor: markRaw(data.actor),
      });
    }

    static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
      super.DEFAULT_OPTIONS,
      {
        tag: 'div',
        classes: [SYSTEM_ID, VUE_APP_CLASS, ROLL_DIALOG_CLASS],
        position: {
          width: 360,
          height: 'auto',
        },
        window: {
          icon: 'fas fa-dice-d20',
          resizable: true,
        },
      },
      { inplace: false }
    );
  }

  return RollDialogConfigBase;
}

export { useRollDialogConfigBase };
