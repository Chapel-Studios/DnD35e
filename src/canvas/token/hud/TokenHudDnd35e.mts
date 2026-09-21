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
 * `movementActionGating.mts`) are untouched — only the click's effect changes.
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
 * handed to Vue's `reactive()` wholesale.
 *
 * @module
 */
import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import { Creature } from '@actors/creature/index.mjs';
import { applyProneToggle } from '@canvas/token/logic/proneToggle.mjs';
import type { ApplicationRenderContext } from '@client/applications/_types.mjs';
import type { HandlebarsRenderOptions } from '@client/applications/api/handlebars-application.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { TokenDocumentDnd35e } from '@documents/scene/tokenDocument/TokenDocumentDnd35e.mjs';
import { buildProneToggleCard } from '@source/dice/index.mjs';
import TokenHudApp from '@vueApps/tokenHud/TokenHudApp.vue';
import { useVueAppBaseMixin } from '@vueApps/VueAppBaseMixin.mjs';
import type { App, Component } from 'vue';
import { createApp, reactive } from 'vue';

import { DROP_PRONE_MOVEMENT_ACTION, STAND_UP_MOVEMENT_ACTION } from '../logic/movementActionGating.mjs';
import { getCombatManeuverChoices, getWeaponActionChoices } from './tokenHudActions.mjs';
import type { TokenHudContext } from './tokenHudTypes.mjs';

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
  private readonly reactiveContext: TokenHudContext = reactive({
    _id: '',
    id: '',
    isGM: false,
    isGamePaused: false,
    hidden: false,
    locked: false,
    elevation: 0,
    elevationDisabled: false,
    canConfigure: false,
    canToggleCombat: false,
    combatActive: false,
    targeted: false,
    displayBar1: false,
    bar1Value: null,
    bar1Editable: false,
    displayBar2: false,
    bar2Value: null,
    bar2Editable: false,
    statusEffectsIcon: '',
    statusEffects: [],
    movementActionIcon: undefined,
    movementActionImg: undefined,
    movementActions: [],
    levels: [],
    canChangeLevel: false,
    weaponActions: [],
    combatManeuvers: [],
  });

  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      actions: {
        attackAction: TokenHudDnd35e.#onAttackAction,
        combatManeuver: TokenHudDnd35e.#onCombatManeuver,
        movementAction: TokenHudDnd35e.#onMovementAction,
      },
    },
    { inplace: false }
  );

  protected override get vueComponent (): Component {
    return TokenHudApp;
  }

  protected override async _prepareContext (options: HandlebarsRenderOptions): Promise<TokenHudContext> {
    const raw = await super._prepareContext(options) as RawTokenHudContext;
    const actor = this.actor as ActorDnd35e | undefined;

    return {
      _id: raw._id,
      id: raw.id,
      isGM: raw.isGM,
      isGamePaused: raw.isGamePaused,
      hidden: raw.hidden,
      locked: raw.locked,
      elevation: raw.elevation,
      elevationDisabled: raw.locked || (raw.isGamePaused && !raw.isGM),
      canConfigure: raw.canConfigure,
      canToggleCombat: raw.canToggleCombat,
      combatActive: raw.combatClass === 'active',
      targeted: raw.targetClass === 'active',
      displayBar1: raw.displayBar1,
      bar1Value: raw.bar1Data?.value ?? null,
      bar1Editable: raw.bar1Data?.editable ?? false,
      displayBar2: raw.displayBar2,
      bar2Value: raw.bar2Data?.value ?? null,
      bar2Editable: raw.bar2Data?.editable ?? false,
      statusEffectsIcon: CONFIG.controlIcons.effects,
      statusEffects: Object.values(raw.statusEffects),
      movementActionIcon: raw.movementActionsConfig?.icon,
      movementActionImg: raw.movementActionsConfig?.img,
      movementActions: Object.values(raw.movementActions),
      levels: Object.values(raw.levels),
      canChangeLevel: raw.canChangeLevel,
      weaponActions: actor ? getWeaponActionChoices(actor) : [],
      combatManeuvers: actor ? getCombatManeuverChoices() : [],
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

    const targetToken = game.user?.targets?.first() ?? null;
    if (!targetToken && game.combat?.started) {
      ui.notifications.warn(game.i18n.localize('dnd35e.COMBAT.SelectTargetFirst'));
      return;
    }

    await actor.useAction(itemId, actionId, targetToken?.actor?.id);
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
    const token = this.document as TokenDocumentDnd35e;

    if (action === DROP_PRONE_MOVEMENT_ACTION || action === STAND_UP_MOVEMENT_ACTION) {
      const actor = this.actor as ActorDnd35e | undefined;
      if (!actor) return;

      const droppedProne = action === DROP_PRONE_MOVEMENT_ACTION;
      await applyProneToggle(actor, token, droppedProne);

      const combat = game.combat;
      const tokenId = token.id;
      const combatant = combat?.started && tokenId
        ? (combat.getCombatantsByToken(tokenId)[0] as CombatantDnd35e | undefined)
        : undefined;
      if (combatant) await buildProneToggleCard(combatant, actor, droppedProne, !droppedProne);
      return;
    }

    await token.update({ movementAction: action });
  }
}

export { TokenHudDnd35e };
