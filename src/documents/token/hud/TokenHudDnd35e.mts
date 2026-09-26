/**
 * TokenHudDnd35e — Vue-owned Token HUD (poc.10 §10.11). Extends core's `TokenHUD` and layers
 * `useVueAppBaseMixin` on top, exactly like `CombatTrackerDnd35e` — see that class's doc
 * comment for the full rationale. `BasePlaceableHUD`'s `_onSubmit`/`_postRender`/`_updatePosition`
 * and `TokenHUD`'s native `combat`/`target`/`effect`/`level` action handlers all keep running
 * unmodified: they're wired by CSS class/`data-action` against `this.element`, not against
 * Handlebars-rendered nodes specifically, so the Vue template reproduces the exact same
 * classes/`data-*` attributes core's own `token-hud.hbs` uses. `movementActionHudDecoration.mts`'s
 * `renderTokenHUD` hook (grey-out/provokes badge DOM injection) also keeps working unmodified for
 * the same reason.
 *
 * `movementAction` itself IS overridden (see `#onMovementAction`) — the `dropProne`/`standUp`
 * entries are special-cased to call `applyProneToggle()` directly instead of core's default
 * behavior (`document.update({movementAction: ...})`, staging a pending mode for a future
 * confirming drag); every other movement action falls through to that same default update,
 * unchanged. The palette entries themselves (icon/label/position/`canSelect` gating, see
 * `movementActionGating.mts`) are untouched — only the click's effect changes. `standUp` spends
 * a move action first (gated + refundable, same `spendAction`/`refundAction` pattern as every
 * other action-economy consumer) — `dropProne` remains free per SRD.
 *
 * Two more new actions are added on top of core's set: `attackAction` (Weapon Attacks palette
 * entries) and `combatManeuver` (Combat Maneuvers palette entries, §10.11's new bottom-row
 * controls).
 *
 * `_prepareContext()` calls `super._prepareContext()` (the same context core's own Handlebars
 * render would have used) and flattens the result into plain data — Record-shaped fields
 * (`statusEffects`/`movementActions`/`levels`) become arrays, and `movementActionsConfig`
 * (a `CONFIG.Token.movement.actions` entry, which carries function-valued keys like `canSelect`)
 * is narrowed down to just the two primitive fields the template needs (`icon`/`img`) rather than
 * handed to Vue's `reactive()` wholesale. Bar 1's `displayBar1`/`bar1Value`/`bar1Editable` only
 * fall through to core's `raw.displayBar1`/`raw.bar1Data` when `useDefaultHpBar` is on — otherwise
 * they're read straight off the actor's `system.hp.current`/`isOwner`, so the compact widget works
 * regardless of whatever attribute (if any) bar1 is actually configured for.
 *
 * @module
 */
import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import { performStandUpOrDropProne } from '@actors/creature/Actions/ChangeProneStatus.mjs';
import { Creature } from '@actors/creature/index.mjs';
import type { HpAdjustmentType } from '@actors/creature/sheet/components/constants.mjs';
import type { ApplicationRenderContext } from '@client/applications/_module.mjs';
import type { HandlebarsRenderOptions } from '@client/applications/api/handlebars-application.mjs';
import type { TokenDocumentDnd35e } from '@documents/scene/tokenDocument/TokenDocumentDnd35e.mjs';
import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';
import { useVueAppBaseMixin } from '@vueApps/VueAppBaseMixin.mjs';
import type { App, Component } from 'vue';
import { createApp, reactive } from 'vue';

import { DROP_PRONE_MOVEMENT_ACTION, STAND_UP_MOVEMENT_ACTION } from '../logic/movementActionGating.mjs';
import type { BottomHudBarProps } from './components/BottomHudBar.vue';
import type { LeftHudBarProps } from './components/LeftHudBar.vue';
import type { RightHudBarProps } from './components/RightHudBar.vue';
import { getCombatManeuverChoices, getWeaponActionChoices } from './tokenHudActions.mjs';
import TokenHudApp from './TokenHudApp.vue';
import type { MiddleHudBarProps, TokenHudContext } from './tokenHudTypes.mjs';

interface RawBarData {
  value: number | string | null;
  editable: boolean;
}

interface RawChoice {
  id: string;
  cssClass: string;
}

interface RawStatusEffect extends RawChoice {
  title: string;
  src: string;
}

interface RawMovementAction extends RawChoice {
  label: string;
  icon?: string;
  img?: string;
}

interface RawLevel extends RawChoice {
  name: string;
}

/** Intermediate merged shape `TokenHUD#_prepareContext()`/`BasePlaceableHUD#_prepareContext()` build. */
interface RawTokenHudContext extends ApplicationRenderContext {
  _id: string;
  id: string;
  isGM: boolean;
  isGamePaused: boolean;
  hidden: boolean;
  locked: boolean;
  elevation: number;
  canConfigure: boolean;
  canToggleCombat: boolean;
  displayBar1: boolean;
  bar1Data: RawBarData | null;
  displayBar2: boolean;
  bar2Data: RawBarData | null;
  combatClass: string;
  targetClass: string;
  statusEffects: Record<string, RawStatusEffect>;
  movementActions: Record<string, RawMovementAction>;
  movementActionsConfig?: { icon?: string; img?: string };
  levels: Record<string, RawLevel>;
  canChangeLevel: boolean;
}

const TokenHUDCore = foundry.applications.hud.TokenHUD;
const TokenHudVueBase = useVueAppBaseMixin(TokenHUDCore);

class TokenHudDnd35e extends TokenHudVueBase {
  /** Persistent reactive context handed to the Vue app; mutated in place on every render. */
  private readonly reactiveContext = reactive<TokenHudContext>({
    id: '',
    _id: '',
    leftHudContext: {
      elevation: 0,
      elevationDisabled: false,
      canChangeLevel: false,
      levels: [],
      locked: false,
      canConfigure: false,
    },
    rightHudContext: {
      canToggleCombat: false,
      combatActive: false,
      targeted: false,
      hidden: false,
      movementActions: [],
      statusEffects: [],
      movementActionIcon: undefined,
      movementActionImg: undefined,
    },
    middleHudContext: {
      useDefaultHpBar: false,
      displayBar1: false,
      bar1Value: null,
      bar1Editable: false,
      displayBar2: false,
      bar2Value: null,
      bar2Editable: false,
    },
    bottomHudContext: {
      combatManeuvers: [],
      weaponActions: [],
    },
  });

  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      actions: {
        attackAction: TokenHudDnd35e.#onAttackAction,
        adjustHp: TokenHudDnd35e.#onAdjustHp,
        combatManeuver: TokenHudDnd35e.#onCombatManeuver,
        movementAction: TokenHudDnd35e.#onMovementAction,
      },
    },
    { inplace: false }
  );

  protected override get vueComponent (): Component {
    return TokenHudApp;
  }

  protected override async _prepareContext(options: HandlebarsRenderOptions): Promise<TokenHudContext> {
    const raw = await super._prepareContext(options) as RawTokenHudContext;
    const actor = this.actor;

    // Compact widget reads HP straight off the actor rather than through bar1Data — it must
    // work regardless of whatever attribute (if any) bar1 happens to be configured for.
    const creature = actor instanceof Creature ? actor : null;
    const useDefaultHpBar = Boolean(this.document.getFlag('dnd35e', 'useDefaultHpBar'));
    const displayBar1 = useDefaultHpBar
      ? raw.displayBar1
      : !!creature;
    const bar1Value = useDefaultHpBar
      ? (raw.bar1Data?.value ?? null)
      : (creature?.system.hp.current ?? null);
    const bar1Editable = useDefaultHpBar
      ? (raw.bar1Data?.editable ?? false)
      : Boolean(creature?.isOwner);

    const leftHudContext: LeftHudBarProps = {
      elevation: raw.elevation,
      elevationDisabled: raw.locked 
        || (raw.isGamePaused && !raw.isGM),
      canChangeLevel: raw.canChangeLevel,
      levels: Object.values(raw.levels),
      locked: raw.locked,
      canConfigure: raw.canConfigure,
    };

    const rightHudContext: RightHudBarProps = {
      hidden: raw.hidden,
      statusEffects: Object.values(raw.statusEffects),
      movementActionIcon: raw.movementActionsConfig?.icon,
      movementActionImg: raw.movementActionsConfig?.img,
      movementActions: Object.values(raw.movementActions),
      targeted: raw.targetClass === 'active',
      canToggleCombat: raw.canToggleCombat,
      combatActive: raw.combatClass === 'active',
    };

    const middleHudContext: MiddleHudBarProps = {
      useDefaultHpBar,
      displayBar1,
      bar1Value,
      bar1Editable,
      displayBar2: raw.displayBar2,
      bar2Value: raw.bar2Data?.value ?? null,
      bar2Editable: raw.bar2Data?.editable ?? false,
    };

    const isCreature = actor && actor instanceof Creature;
    const weaponActions = isCreature
      ? await getWeaponActionChoices(actor)
      : [];
    const combatManeuvers = isCreature
      ? getCombatManeuverChoices()
      : [];
    const bottomHudContext: BottomHudBarProps = {
      weaponActions: weaponActions,
      combatManeuvers: combatManeuvers,
    };

    return {
      id: raw.id,
      _id: raw._id,
      leftHudContext,
      rightHudContext,
      bottomHudContext,
      middleHudContext,
    };
  }

  protected override async _replaceHTML (context: object, content: HTMLElement, options: object): Promise<void> {
    Object.assign(this.reactiveContext, context as TokenHudContext);
    await super._replaceHTML(context as never, content, options as never);
  }

  protected override _createVueApp (): App {
    return createApp(this.vueComponent, { context: this.reactiveContext });
  }

  /** Weapon Attacks palette entry click — mirrors the sheet Actions tab's `onAttack()` (WeaponsSection.vue). */
  static async #onAttackAction (this: TokenHudDnd35e, _event: PointerEvent, target: HTMLElement): Promise<void> {
    const { itemId, actionId, enabled } = target.dataset;
    if (!itemId || !actionId || enabled === 'false') return;

    const actor = this.actor;
    if (!(actor instanceof Creature)) return;

    const targetTokens = game.user?.targets ?? [];
    if (targetTokens.size === 0 && game.combat?.started) {
      ui.notifications.warn(game.i18n.localize('dnd35e.COMBAT.SelectTargetFirst'));
      return;
    }

    await actor.useAction(itemId, actionId, [...targetTokens] as TokenDnd35e[]);
  }

  /** Compact bar1 HP widget's apply button (TokenHpUpdater.vue) — reads the amount/type staged in the button's own data attributes since the Vue tree has no document/store access here. */
  static async #onAdjustHp (this: TokenHudDnd35e, _event: PointerEvent, target: HTMLElement): Promise<void> {
    const actor = this.actor;
    if (!(actor instanceof Creature)) return;

    const amount = Number(target.dataset.amount);
    const adjustmentType = target.dataset.adjustmentType as HpAdjustmentType | undefined;
    if (!adjustmentType || Number.isNaN(amount) || amount === 0) return;

    await actor.updateHP(amount, adjustmentType);
  }

  /** Combat Maneuvers palette entry click — Total Defense's real mechanic is Story E's scope (see tokenHudActions.mts). */
  static #onCombatManeuver (this: TokenHudDnd35e, _event: PointerEvent, target: HTMLElement): void {
    if (target.dataset.enabled === 'false') return;
    ui.notifications.info(game.i18n.localize('dnd35e.COMBAT.Maneuver.NotYetImplemented'));
  }

  /**
   * Movement-action palette entry click — overrides core's `TokenHUD#onSelectMovementAction`
   * wholesale (same `movementAction` action id) so the `dropProne`/`standUp` entries can be
   * special-cased to an instant toggle; every other entry falls through to the same plain
   * `document.update({movementAction})` core's own (private, un-callable-through) handler does.
   */
  static async #onMovementAction (this: TokenHudDnd35e, _event: PointerEvent, target: HTMLElement): Promise<void> {
    const action = target.dataset.movementAction || null;
    const token = this.document;
    // Assume success by default; will be updated if the action is drop prone or stand up.
    let wasSuccess = true;

    if (action === DROP_PRONE_MOVEMENT_ACTION || action === STAND_UP_MOVEMENT_ACTION) {
      const actor = this.actor;
      if (!actor || !(actor instanceof Creature)) return;

      wasSuccess = await performStandUpOrDropProne(actor, token, action);

      return;
    }

    if (wasSuccess) {
      await token.update({ movementAction: action });
    }
  }
}

// Type-only override merged onto the class — base getters resolve through the untyped
// Foundry `Actor`/`TokenDocument`, not `ACTORS_DND35E`/`TokenDocumentDnd35e`.
interface TokenHudDnd35e {
  get actor(): ACTORS_DND35E | undefined;
  get document(): TokenDocumentDnd35e;
}

export { TokenHudDnd35e };
