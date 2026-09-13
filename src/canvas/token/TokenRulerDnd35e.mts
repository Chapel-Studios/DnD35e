import type { TokenRulerWaypoint } from '@client/_module.mjs';
import type { DeepReadonly } from '@common/_shared-types.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { getMovementSession } from '@documents/combat/combatant/movementSession.mjs';
import { useSettingsStore } from '@settings/index.mjs';

import type { SessionAwareBudget } from './logic/movementBudget.mjs';
import { getMovementBudget, getSessionAwareBudget } from './logic/movementBudget.mjs';
import waypointLabelTemplateSource from './templates/waypoint-label.hbs?raw';
import type { TokenDnd35e } from './TokenDnd35e.mjs';

/** Color applied to waypoints/segments once cumulative movement cost exceeds the actor's budget. */
const OVER_BUDGET_COLOR = 0xff0000;

/**
 * Arbitrary registry key for the precompiled waypoint label partial.
 * `Handlebars.getTemplate()` returns `Handlebars.partials[id]` directly
 * when `id in Handlebars.partials`, so pre-registering the compiled template under
 * this id (below) makes Foundry skip its usual server-fetch-and-compile path entirely.
 */
const WAYPOINT_LABEL_TEMPLATE_ID = 'dnd35e.canvas.token.waypoint-label';

Handlebars.registerPartial(WAYPOINT_LABEL_TEMPLATE_ID, Handlebars.compile(waypointLabelTemplateSource, { preventIndent: true }));

/**
 * TokenRuler subclass that visualizes the actor's movement budget while
 * dragging a token: waypoint labels show "distance / budget", and the path turns
 * red once the drag exceeds the budget. Registered via `CONFIG.Token.rulerClass`.
 *
 * Both the displayed distance and the budget reflect the combatant's whole turn, not
 * just this drag in isolation — Foundry's own waypoint cost already accumulates across
 * every drag made this turn (see `getSessionAwareBudget`'s docs), so a drag continuing
 * after an earlier one this turn shows the running total (e.g. "35 / 60") and escalates
 * to a full-round Double Move's 2x budget once that total exceeds a single move action's
 * budget, matching `TokenDocumentDnd35e#consumeSessionMovement`'s own escalation.
 */
class TokenRulerDnd35e extends foundry.canvas.placeables.tokens.TokenRuler {
  static override WAYPOINT_LABEL_TEMPLATE = WAYPOINT_LABEL_TEMPLATE_ID;

  protected override _getWaypointLabelContext(
    waypoint: DeepReadonly<TokenRulerWaypoint>,
    state: object
  ): object | void {
    const context = super._getWaypointLabelContext(waypoint, state) as Record<string, unknown> | void;
    if (!context) return context;

    const actor = this.token.actor;
    if (!actor) return context;

    const { budget } = this.#resolveSessionBudget(waypoint);
    context.budget = { total: budget.toNearest(0.01).toLocaleString(game.i18n.lang) };
    return context;
  }

  protected override _getWaypointStyle(waypoint: DeepReadonly<TokenRulerWaypoint>): {
    radius: number;
    shape?: 'circle' | 'square' | 'diamond' | 'triangleUp' | 'triangleDown' | 'hexagonFlat' | 'hexagonPointy';
    color?: PIXI.ColorSource;
    alpha?: number;
  } {
    const style = super._getWaypointStyle(waypoint);
    if (this.#resolveSessionBudget(waypoint).overBudget) style.color = OVER_BUDGET_COLOR;
    return style;
  }

  protected override _getSegmentStyle(
    waypoint: DeepReadonly<TokenRulerWaypoint>
  ): { width: number; color?: PIXI.ColorSource; alpha?: number } {
    const style = super._getSegmentStyle(waypoint);
    if (this.#resolveSessionBudget(waypoint).overBudget) style.color = OVER_BUDGET_COLOR;
    return style;
  }

  /**
   * Resolves this waypoint's movement action budget, converting the actor's raw
   * speed-based budget into the scene's grid distance units to compare against
   * `waypoint.measurement.cost` (already the whole turn's cumulative distance — see
   * `getSessionAwareBudget`'s docs). Outside an active encounter (or with no combatant
   * found for this token), there's no action economy to escalate against, so this
   * degrades to a plain single-drag budget check.
   */
  #resolveSessionBudget(waypoint: DeepReadonly<TokenRulerWaypoint>): SessionAwareBudget {
    const actor = this.token.actor;
    const { measurement: { convertToLocalizedDistance } } = useSettingsStore();
    const singleBudget = convertToLocalizedDistance(getMovementBudget(actor, waypoint.action));

    const tokenId = this.token.document.id;
    const combatant = tokenId
      ? (game.combat?.getCombatantsByToken(tokenId)[0] as CombatantDnd35e | undefined)
      : undefined;
    // Once the standard action is actually spent (committing an escalated Double Move),
    // `actionEconomy.actions.standard` flips to unavailable — so we need to check if this turn
    // has already-escalated the budget, accidently converting back to a single move's budget.
    const isBudgetEscalatable = (combatant?.actionEconomy.actions.standard ?? false)
      || (combatant ? getMovementSession(combatant).spentTiers.includes('standard') : false);

    return getSessionAwareBudget(singleBudget, waypoint.action, waypoint.measurement.cost, isBudgetEscalatable);
  }
}

// Type-only override merged onto the class — base getter resolves through the untyped
// Foundry `Token`, not `TokenDnd35e`.
interface TokenRulerDnd35e {
  get token(): TokenDnd35e;
}

export { TokenRulerDnd35e };
