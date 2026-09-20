/**
 * Vue-based D20 roll dialog — situational modifier + roll mode, used by any d20 check
 * (saves, ability checks, attack rolls). See phase-07-roll-formulas.md §7.9.
 */
import type { WieldMode } from '@actors/baseActor/ActorDnd35e.mjs';
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { ROLL_DIALOG_CLASS, VUE_APP_CLASS } from '@constants/cssClasses.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import { useVueDialogMixin } from '@vueApps/VueDialogMixin.mjs';
import type { Component } from 'vue';
import { markRaw } from 'vue';

import D20RollDialogApp from './D20RollDialogApp.vue';

/**
 * A single attack-roll combat modifier (poc.10 Story D, §10.7) — Attack Type
 * (charge/defensiveFighting/nonLethal) and Combat Status (flanking/highGround/squeezing/
 * prone/proficient) toggles share this shape. `label`/`tooltip` are already localized by
 * the caller (`executeAction()`), same convention as `D20RollDialogData.title`/`baseLabel`.
 * `checked`'s effect on `value` is inverted for `proficient` — see §10.7's Proficient row —
 * `executeAction()` reads that toggle's `checked` state directly rather than folding its
 * `value` into the generic sum.
 */
interface CombatModifierToggle {
  id: string;
  group: 'attackType' | 'combatStatus';
  label: string;
  tooltip: string;
  value: number;
  checked: boolean;
  /** Whether this toggle's initial `checked` state came from geometry/status detection vs. a fixed default. */
  autoDetected: boolean;
}

/** An ammo option available for the acting action's `range.ammoType` — populated by Story F. */
interface AmmoOption {
  itemUuid: string;
  name: string;
}

/** Input data for the D20 roll dialog. */
interface D20RollDialogData {
  /** Already-localized dialog title, e.g. "Roll Fortitude Save". */
  title: string;
  /** Already-localized label for the base total row, e.g. "Fortitude". */
  baseLabel: string;
  /** The actor's current computed value for the stat being rolled. */
  baseTotal: number;
  /**
   * A formula (not a plain number) — resolved through FormulaFamiliar against `#self`
   * (the rolling actor) once the user rolls. See `D20RollDialogApp.vue`'s formula input.
   */
  situationalModifier: string;
  rollMode: string;
  actorName: string;
  actorImage: string;
  /** The rolling actor — used to build the `#self` FormulaFamiliar context for the modifier input. */
  actor: ActorDnd35e;
  /**
   * Attack-roll-only combat modifiers (poc.10 Story D) — undefined for saves/initiative.
   * Round-trips through `D20RollDialogResult` with each toggle's final `checked` state.
   */
  combatModifiers?: CombatModifierToggle[];
  /**
   * A formula field folded only into the resolved damage formula once damage is actually
   * rolled — never into the attack roll itself (poc.10 Story D, §10.7). Undefined for
   * saves/initiative.
   */
  damageBonus?: string;
  /** Wield Mode (poc.10 Story D, §10.3) — auto-filled by `detectWieldMode()`, always overridable. */
  wieldMode?: WieldMode;
  /** Hand select (poc.10 Story D, §10.3) — auto-filled, always overridable. */
  hand?: 'main' | 'off';
  /** Reserved Ammo select slot (poc.10 Story D/F) — populated by Story F; empty/undefined hides the field. */
  ammoOptions?: AmmoOption[];
  ammo?: string | null;
}

/** Result returned when the user confirms the roll. */
interface D20RollDialogResult {
  /** The resolved numeric value of the formula the user entered (see `D20RollDialogData.situationalModifier`). */
  situationalModifier: number;
  rollMode: string;
  /** Present only when `D20RollDialogData.combatModifiers` was provided — see that field's doc. */
  combatModifiers?: CombatModifierToggle[];
  /**
   * The resolved damage-bonus formula (FormulaFamiliar tokens replaced, dice terms kept
   * intact for later evaluation) — present only when `D20RollDialogData.damageBonus` was provided.
   */
  damageBonus?: string;
  wieldMode?: WieldMode;
  hand?: 'main' | 'off';
  ammo?: string | null;
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
    // `actor` is a live Foundry Document — never let Vue's reactive() wrap it (Documents
    // have private class fields/complex internal state that break under a reactive Proxy).
    this.initializeReactiveData({ ...data, actor: markRaw(data.actor) });
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
export type { AmmoOption, CombatModifierToggle, D20RollDialogData, D20RollDialogResult };
