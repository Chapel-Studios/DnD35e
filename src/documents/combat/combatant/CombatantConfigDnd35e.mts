/**
 * CombatantConfigDnd35e — Vue-owned Combatant configuration sheet, opened via the tracker's
 * right-click "Update" context menu entry (unchanged core behavior — see
 * `combat-tracker.mjs`'s `getCombatant(li)?.sheet.render(...)`, which resolves this class through
 * the standard `DocumentSheetConfig.registerSheet` mechanism registered in `../registration.mts`).
 *
 * Extends core's `CombatantConfig` and layers `useVueAppBaseMixin` on top — not
 * `useVueDocumentSheetMixin`, since that mixin's mask/secret/view-mode machinery is built for
 * Item/Actor/ActiveEffect (which have `system`/`effects`) and doesn't apply to a plain
 * flag-editing Combatant form.
 *
 * Alongside the basic document fields core's own sheet already exposes (name/img/initiative/
 * hidden/defeated), this sheet edits the two custom flag groups this system stores on
 * `flags.dnd35e`: `actionEconomy` (pools/BAB/AoO/used-flags — see `combatantActionEconomy.mts`,
 * shown in the sheet's main section) and `movementSession` (per-turn drag bookkeeping — see
 * `movementSession.mts`, shown behind a collapsed "Advanced" expando since it's mostly internal
 * correlation IDs rather than data a GM would routinely hand-edit).
 *
 * A single Save button assembles the whole form and applies it as three writes at once: the
 * basic document `update()`, `setActionEconomy()`, and `setMovementSession()`.
 *
 * @module
 */
import type { HandlebarsRenderOptions } from '@client/applications/api/handlebars-application.mjs';
import { VUE_APP_CLASS } from '@constants/cssClasses.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import CombatantConfigApp from '@vueApps/combatantConfig/CombatantConfigApp.vue';
import { useVueAppBaseMixin } from '@vueApps/VueAppBaseMixin.mjs';
import type { App, Component } from 'vue';
import { createApp, reactive } from 'vue';

import type { CombatantActionEconomy } from './combatantActionEconomy.mjs';
import { getActionEconomy, setActionEconomy } from './combatantActionEconomy.mjs';
import type { CombatantDnd35e } from './CombatantDnd35e.mjs';
import type { MovementSession } from './movementSession.mjs';
import { getMovementSession, setMovementSession } from './movementSession.mjs';

interface CombatantConfigContext {
  actorName: string;
  tokenName: string;
  name: string;
  img: string;
  initiative: number | null;
  hidden: boolean;
  defeated: boolean;
  actionEconomy: CombatantActionEconomy;
  movementSession: MovementSession;
}

/** Shape emitted by the Vue app's Save button — everything the form can edit, in one payload. */
interface CombatantConfigSaveData {
  name: string;
  img: string;
  initiative: number | null;
  hidden: boolean;
  defeated: boolean;
  actionEconomy: CombatantActionEconomy;
  movementSession: MovementSession;
}

const DEFAULT_CONTEXT: CombatantConfigContext = {
  actorName: '',
  tokenName: '',
  name: '',
  img: '',
  initiative: null,
  hidden: false,
  defeated: false,
  actionEconomy: {
    actions: { standard: true, move: true, minor: true, swift: true, aoo: 0 },
    bab: { main: 0, off: 0 },
    used: { standard: false, move: false, minor: false, swift: false, standardAttackUsed: false, movedAfterAttack: false, chargedThisTurn: false },
  },
  movementSession: {
    category: null,
    cumulativeCost: 0,
    spentTiers: [],
    firstOrigin: null,
    messageId: null,
    lastMovementAction: null,
    fullRoundMove: null,
  },
};

const CombatantConfigCore = foundry.applications.sheets.CombatantConfig<CombatantDnd35e>;

class CombatantConfigDnd35e extends useVueAppBaseMixin(CombatantConfigCore) {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      classes: [SYSTEM_ID, VUE_APP_CLASS],
      position: { width: 480 },
      window: { resizable: true },
    },
    { inplace: false }
  );

  /** Persistent reactive context handed to the Vue app; mutated in place on every render. */
  private readonly reactiveContext: CombatantConfigContext = reactive(structuredClone(DEFAULT_CONTEXT));

  protected override get vueComponent (): Component {
    return CombatantConfigApp;
  }

  protected override async _prepareContext (_options: HandlebarsRenderOptions): Promise<CombatantConfigContext> {
    const combatant = this.document as CombatantDnd35e;
    return {
      actorName: combatant.actor?.name ?? '',
      tokenName: combatant.token?.name ?? '',
      name: combatant.name ?? '',
      img: combatant.img ?? '',
      initiative: combatant.initiative,
      hidden: combatant.hidden,
      defeated: combatant.defeated,
      actionEconomy: getActionEconomy(combatant),
      movementSession: getMovementSession(combatant),
    };
  }

  protected override async _replaceHTML (context: object, content: HTMLElement, options: object): Promise<void> {
    Object.assign(this.reactiveContext, context as CombatantConfigContext);
    await super._replaceHTML(context as never, content, options as never);
  }

  protected override _createVueApp (): App {
    return createApp(this.vueComponent, {
      context: this.reactiveContext,
      onSave: this.#onSave.bind(this),
      onCancel: this.#onCancel.bind(this),
    });
  }

  async #onSave (data: CombatantConfigSaveData): Promise<void> {
    const combatant = this.document as CombatantDnd35e;
    await combatant.update({
      name: data.name,
      img: data.img,
      initiative: data.initiative,
      hidden: data.hidden,
      defeated: data.defeated,
    });

    // `used.standard/move/minor/swift` mirror `actions.standard/move/minor/swift` (see
    // `toggleActionAvailability`) — the form only edits the pool availability toggles, so
    // re-derive the mirrored `used` flags here rather than exposing redundant checkboxes.
    const { actionEconomy } = data;
    actionEconomy.used.standard = !actionEconomy.actions.standard;
    actionEconomy.used.move = !actionEconomy.actions.move;
    actionEconomy.used.minor = !actionEconomy.actions.minor;
    actionEconomy.used.swift = !actionEconomy.actions.swift;
    await setActionEconomy(combatant, actionEconomy);

    await setMovementSession(combatant, data.movementSession);
    await this.close();
  }

  async #onCancel (): Promise<void> {
    await this.close();
  }
}

export { CombatantConfigDnd35e };
export type { CombatantConfigContext, CombatantConfigSaveData };
