/**
 * CombatTrackerDnd35e — Vue-owned combat tracker (header, turn list, footer).
 *
 * Extends core's `CombatTracker` and layers `useVueAppBaseMixin` on top. That mixin overrides
 * only `_renderHTML`/`_replaceHTML`, replacing Handlebars' `PARTS`-template rendering with a
 * single mounted Vue app — everything else on `CombatTracker` (`_onFirstRender`'s context menus,
 * `_attachFrameListeners`' hover/dblclick/initiative-input wiring, `_onClickAction`'s
 * `data-action` dispatch, `_onRender`'s scroll-into-view) still runs unmodified, because all of
 * it is wired by CSS class/`data-action` against `this.element`, not against Handlebars-rendered
 * nodes specifically. The Vue templates intentionally reuse core's exact class names/actions so
 * none of that needs reimplementing — only markup and context-building are ours.
 *
 * `_prepareContext()` calls `_prepareCombatContext`/`_prepareTrackerContext` directly (the same
 * methods Handlebars' per-part dispatch would have called) and flattens the result into plain
 * data merged with each turn's `actionEconomy`. Foundry Document instances are deliberately
 * excluded from the returned shape — Vue's `reactive()` proxies break class instances that use
 * private (`#`) fields, which core Documents do.
 *
 * One new action is added on top of core's set: `toggleActionEconomy` (GM click on a
 * standard/move/minor action-economy pip in `CombatTrackerRow.vue`, directly flipping that
 * pool's availability via `toggleActionAvailability()` — see `combatantActionEconomy.mts`).
 *
 * @module
 */
import type { ApplicationRenderContext } from '@client/applications/_types.mjs';
import type { HandlebarsRenderOptions } from '@client/applications/api/handlebars-application.mjs';
import { MINOR_ACTION, MOVE_ACTION, STANDARD_ACTION, SWIFT_ACTION } from '@constants/actionEconomy.mjs';
import type { CombatTrackerContext, CombatTrackerTurn } from '@documents/combat/combatTrackerTypes.mjs';
import CombatTrackerApp from '@vueApps/combatTracker/CombatTrackerApp.vue';
import { useVueAppBaseMixin } from '@vueApps/VueAppBaseMixin.mjs';
import type { App, Component } from 'vue';
import { createApp, reactive } from 'vue';

import { getActionEconomy, toggleActionAvailability } from './combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from './combatant/CombatantDnd35e.mjs';
import type { CombatDnd35e } from './CombatDnd35e.mjs';

/** Intermediate plain shape `_prepareCombatContext`/`_prepareTrackerContext` mutate in place. */
interface RawTrackerContext extends ApplicationRenderContext {
  user: { isGM: boolean };
  /** `name` is a real Combat schema field at runtime; the ambient Foundry types don't declare it. */
  combat: (CombatDnd35e & { name: string }) | null;
  hasCombat: boolean;
  combats: { id: string; name: string; label: number; active: boolean }[];
  control: boolean;
  css: string;
  currentIndex: number;
  displayCycle: boolean;
  initiativeIcon: { icon: string; hover: string };
  nextId?: string;
  previousId?: string;
  turns: CombatTrackerTurn[];
  hasDecimals: boolean;
}

const CombatTrackerCore = foundry.applications.sidebar.tabs.CombatTracker<CombatDnd35e | null>;
const CombatTrackerVueBase = useVueAppBaseMixin(CombatTrackerCore);

class CombatTrackerDnd35e extends CombatTrackerVueBase {
  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      actions: {
        toggleActionEconomy: CombatTrackerDnd35e.#onToggleActionEconomy,
      },
    },
    { inplace: false }
  );

  /** Persistent reactive context handed to the Vue app; mutated in place on every render. */
  private readonly reactiveContext: CombatTrackerContext = reactive({
    isGM: false,
    hasCombat: false,
    combatName: null,
    combatRound: 0,
    combatTurnsLength: 0,
    combats: [],
    control: false,
    css: '',
    currentIndex: 0,
    displayCycle: false,
    initiativeIcon: { icon: '', hover: '' },
    nextId: undefined,
    previousId: undefined,
    turns: [],
    hasDecimals: false,
  });

  protected override get vueComponent (): Component {
    return CombatTrackerApp;
  }

  protected override async _prepareContext (options: HandlebarsRenderOptions): Promise<CombatTrackerContext> {
    const raw = await super._prepareContext(options) as RawTrackerContext;
    await this._prepareCombatContext(raw, options);
    await this._prepareTrackerContext(raw, options);

    const combat = this.viewed;
    for (const turn of raw.turns) {
      const combatant = combat?.combatants.get(turn.id);
      turn.actionEconomy = combatant ? getActionEconomy(combatant as unknown as CombatantDnd35e) : null;
    }

    return {
      isGM: raw.user.isGM,
      hasCombat: raw.hasCombat,
      combatName: raw.combat?.name ?? null,
      combatRound: raw.combat?.round ?? 0,
      combatTurnsLength: raw.combat?.turns.length ?? 0,
      combats: raw.combats,
      control: raw.control,
      css: raw.css,
      currentIndex: raw.currentIndex,
      displayCycle: raw.displayCycle,
      initiativeIcon: raw.initiativeIcon,
      nextId: raw.nextId,
      previousId: raw.previousId,
      turns: raw.turns,
      hasDecimals: raw.hasDecimals,
    };
  }

  protected override async _replaceHTML (context: object, content: HTMLElement, options: object): Promise<void> {
    Object.assign(this.reactiveContext, context as CombatTrackerContext);
    await super._replaceHTML(context as never, content, options as never);
  }

  protected override _createVueApp (): App {
    return createApp(this.vueComponent, { context: this.reactiveContext });
  }

  /** Action-economy pip click (GM only, template only renders `data-action` for `isGM`) — flips that single pool's availability directly. */
  static async #onToggleActionEconomy (this: CombatTrackerDnd35e, _event: PointerEvent, target: HTMLElement): Promise<void> {
    const flag = target.dataset.actionFlag;
    if (flag !== STANDARD_ACTION && flag !== MOVE_ACTION && flag !== MINOR_ACTION && flag !== SWIFT_ACTION) return;

    const { combatantId } = target.closest<HTMLElement>('[data-combatant-id]')?.dataset ?? {};
    const combatant = combatantId ? this.viewed?.combatants.get(combatantId) : undefined;
    if (!combatant) return;

    await toggleActionAvailability(combatant as unknown as CombatantDnd35e, flag);
  }
}

export { CombatTrackerDnd35e };
