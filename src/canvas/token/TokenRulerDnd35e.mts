import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { TokenRulerWaypoint } from '@client/_module.mjs';
import type { DeepReadonly } from '@common/_shared-types.mjs';
import { useSettingsStore } from '@settings/index.mjs';

import { getMovementBudget, isOverBudget } from './logic/movementBudget.mjs';
import waypointLabelTemplateSource from './templates/waypoint-label.hbs?raw';

/** Color applied to waypoints/segments once cumulative movement cost exceeds the actor's budget. */
const OVER_BUDGET_COLOR = 0xff0000;

/**
 * Arbitrary registry key for the precompiled waypoint label partial — never fetched
 * from disk. `Handlebars.getTemplate()` returns `Handlebars.partials[id]` directly
 * when `id in Handlebars.partials`, so pre-registering the compiled template under
 * this id (below) makes Foundry skip its usual server-fetch-and-compile path entirely.
 */
const WAYPOINT_LABEL_TEMPLATE_ID = 'dnd35e.canvas.token.waypoint-label';

Handlebars.registerPartial(WAYPOINT_LABEL_TEMPLATE_ID, Handlebars.compile(waypointLabelTemplateSource, { preventIndent: true }));

/**
 * TokenRuler subclass that visualizes the actor's land-speed movement budget while
 * dragging a token: waypoint labels show "distance / budget", and the path turns
 * red once the drag exceeds the budget. Registered via `CONFIG.Token.rulerClass`.
 */
class TokenRulerDnd35e extends foundry.canvas.placeables.tokens.TokenRuler {
  static override WAYPOINT_LABEL_TEMPLATE = WAYPOINT_LABEL_TEMPLATE_ID;

  protected override _getWaypointLabelContext(
    waypoint: DeepReadonly<TokenRulerWaypoint>,
    state: object
  ): object | void {
    const context = super._getWaypointLabelContext(waypoint, state) as Record<string, unknown> | void;
    if (!context) return context;

    const actor = this.token.actor as ActorDnd35e | null;
    if (!actor) return context;

    context.budget = { total: this.#getLocalizedBudget(waypoint).toLocaleString(game.i18n.lang) };
    return context;
  }

  protected override _getWaypointStyle(waypoint: DeepReadonly<TokenRulerWaypoint>): {
    radius: number;
    shape?: 'circle' | 'square' | 'diamond' | 'triangleUp' | 'triangleDown' | 'hexagonFlat' | 'hexagonPointy';
    color?: PIXI.ColorSource;
    alpha?: number;
  } {
    const style = super._getWaypointStyle(waypoint);
    if (this.#isOverBudget(waypoint)) style.color = OVER_BUDGET_COLOR;
    return style;
  }

  protected override _getSegmentStyle(
    waypoint: DeepReadonly<TokenRulerWaypoint>
  ): { width: number; color?: PIXI.ColorSource; alpha?: number } {
    const style = super._getSegmentStyle(waypoint);
    if (this.#isOverBudget(waypoint)) style.color = OVER_BUDGET_COLOR;
    return style;
  }

  /**
   * The actor's movement budget converted into the scene's grid distance units, so it
   * can be compared directly against Foundry's own `waypoint.measurement.cost` (which
   * is always expressed in the scene's configured grid distance). `registerScenes()`
   * defaults every new scene's grid to match the world's measurement setting (5ft or
   * 1.5m), so this conversion lines up out of the box — a scene whose grid was
   * manually overridden to disagree with the world setting will read incorrectly.
   */
  #getLocalizedBudget(waypoint: DeepReadonly<TokenRulerWaypoint>): number {
    const actor = this.token.actor as ActorDnd35e | null;
    if (!actor) return 0;
    const { measurement: { convertToLocalizedDistance } } = useSettingsStore();
    return convertToLocalizedDistance(getMovementBudget(actor, waypoint.action));
  }

  #isOverBudget(waypoint: DeepReadonly<TokenRulerWaypoint>): boolean {
    const actor = this.token.actor as ActorDnd35e | null;
    if (!actor) return false;
    return isOverBudget(waypoint.measurement.cost, this.#getLocalizedBudget(waypoint));
  }
}

export { TokenRulerDnd35e };
