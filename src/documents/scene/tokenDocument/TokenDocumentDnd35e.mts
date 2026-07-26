import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import {
  CRAWL_MOVEMENT_ACTION,
  DROP_PRONE_MOVEMENT_ACTION,
  STAND_UP_MOVEMENT_ACTION,
  WALK_MOVEMENT_ACTION,
} from '@canvas/token/logic/movementActionGating.mjs';
import type { TokenMovementOperation, TokenMovementWaypoint } from '@client/documents/_types.mjs';
import type { TokenUpdateOperation } from '@client/documents/token.mjs';
import type { DatabaseCreateCallbackOptions, DatabaseUpdateOperation } from '@common/abstract/_types.mjs';
import { PRONE_CONDITION_ID } from '@constants/conditions.mjs';
import { SIZE_TOKEN_DIMENSIONS } from '@constants/sizes.mjs';

import type { SceneDnd35e } from '../SceneDnd35e.mjs';

class TokenDocumentDnd35e<TParent extends SceneDnd35e | null = SceneDnd35e | null> extends TokenDocument<TParent> {
  protected override async _preCreate(
    data: this['_source'],
    options: DatabaseCreateCallbackOptions,
    user: foundry.documents.BaseUser
  ): Promise<boolean | void> {
    const result = await super._preCreate(data, options, user);
    if (result === false) return false;

    const actor = this.actor as ActorDnd35e | null;
    const size = actor?.system?.size;
    if (size && size in SIZE_TOKEN_DIMENSIONS) {
      const dim = SIZE_TOKEN_DIMENSIONS[size];
      this.updateSource({ width: dim, height: dim });
    }
  }

  /**
   * Detects the `dropProne`/`standUp` custom movement actions (see
   * `movementActionGating.mts`) among the just-completed movement's waypoints and
   * toggles the Prone condition accordingly. Both actions are `teleport: true,
   * measure: true` with a free (`0`) cost, so this is the only signal available that
   * one was used — there's no dedicated "action selected" hook in Foundry's movement
   * pipeline, only completed-movement waypoints.
   *
   * Neither action represents real ground covered (SRD: Drop Prone is a free action,
   * Standing Up doesn't move you), so the confirming drag's displacement is undone
   * with a follow-up `action: 'displace'` waypoint — the same mechanism Foundry's own
   * "undo movement" feature uses to snap a token back to a prior position without it
   * counting as measured movement (no cost, no wall-blocking, no ruler/animation).
   * The movement action is also switched to the mode that logically follows the
   * toggle: crawling while prone, walking again once back on your feet.
   */
  protected override _onUpdateMovement(
    movement: DeepReadonly<TokenMovementOperation>,
    operation: Partial<DatabaseUpdateOperation<TParent>>,
    user: User
  ): void {
    super._onUpdateMovement(movement, operation, user);

    const actor = this.actor as ActorDnd35e | null;
    if (!actor) return;

    const waypoints = movement.passed?.waypoints ?? [];
    const droppedProne = waypoints.some(waypoint => waypoint.action === DROP_PRONE_MOVEMENT_ACTION);
    const stoodUp = waypoints.some(waypoint => waypoint.action === STAND_UP_MOVEMENT_ACTION);
    if (!droppedProne && !stoodUp) return;

    void actor.toggleStatusEffect(PRONE_CONDITION_ID, { active: droppedProne });

    const tokenId = this.id;
    if (!tokenId) return;

    const snapBackWaypoint: Partial<TokenMovementWaypoint> = { ...movement.origin, action: 'displace' };
    const snapBackOperation: Partial<TokenUpdateOperation<TParent>> & {
      movement?: Record<string, { waypoints: Partial<TokenMovementWaypoint>[] }>;
    } = {
      movement: { [tokenId]: { waypoints: [snapBackWaypoint] } },
      diff: false,
      animate: false,
    };
    void this.update(
      { movementAction: droppedProne ? CRAWL_MOVEMENT_ACTION : WALK_MOVEMENT_ACTION },
      snapBackOperation
    );
  }
}

export { TokenDocumentDnd35e };
