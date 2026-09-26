/**
 * proneToggle — direct Prone-condition state change, shared by the Token HUD's
 * dropProne/standUp click handler (`TokenHudDnd35e.mts`) and the chat card's Undo button
 * (`proneToggleCard.mts`). Neither goes through Foundry's movement pipeline anymore — the
 * `CONFIG.Token.movement.actions.dropProne/standUp` entries (see `movementActionGating.mts`)
 * still exist purely so the HUD's movement-action palette keeps showing/gating them in the
 * same place; clicking one now calls `applyProneToggle` directly instead of staging a
 * pending movement mode for a future confirming drag.
 *
 * @module
 */
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { PRONE_CONDITION_ID } from '@constants/conditions.mjs';
import type { TokenDocumentDnd35e } from '@documents/scene/tokenDocument/TokenDocumentDnd35e.mjs';

import { CRAWL_MOVEMENT_ACTION, WALK_MOVEMENT_ACTION } from './movementActionGating.mjs';

/** Toggles the Prone condition on `actor` and switches `token.movementAction` to crawl/walk accordingly. */
async function applyProneToggle(actor: ActorDnd35e, token: TokenDocumentDnd35e, droppedProne: boolean): Promise<void> {
  await actor.toggleStatusEffect(PRONE_CONDITION_ID, { active: droppedProne });
  await token.update({ movementAction: droppedProne ? CRAWL_MOVEMENT_ACTION : WALK_MOVEMENT_ACTION });
}

export { applyProneToggle };
