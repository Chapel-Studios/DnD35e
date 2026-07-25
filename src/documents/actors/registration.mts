import { characterActorType } from '@actors/actorTypes.mjs';
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { ActorProxyDnd35e } from '@actors/baseActor/index.mjs';
import { Character, CharacterSystemModel } from '@actors/character/index.mjs';
import { CharacterSheet } from '@actors/character/sheet/CharacterSheet.mjs';
import {
  buildRunMovementActionConfig,
  canSelectSpeedGatedMovementAction,
  DISABLED_MOVEMENT_ACTIONS,
  RUN_MOVEMENT_ACTION,
  SPEED_GATED_ACTIONS,
} from '@canvas/token/logic/movementActionGating.mjs';
import { TokenDnd35e } from '@canvas/token/TokenDnd35e.mjs';
import { TokenRulerDnd35e } from '@canvas/token/TokenRulerDnd35e.mjs';
import { gatherAspectsFromSchema, registerFamiliarSchema } from '@helpers/formulae/index.mjs';
import { TokenDocumentDnd35e } from '@scene/tokenDocument/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import { ACTOR_TYPES } from './actorTypes.mjs';

export const registerActors = () => {
  CONFIG.dnd35e.actor = {
    ...CONFIG.dnd35e.actor,
    documentClasses: {
      character: Character,
    },
  };

  foundry.helpers.Hooks.once('init', () => {
    CONFIG.Actor.documentClass = ActorProxyDnd35e;
    CONFIG.Token.objectClass = TokenDnd35e;
    CONFIG.Token.documentClass = TokenDocumentDnd35e;
    CONFIG.Token.rulerClass = TokenRulerDnd35e;

    // Register the dnd35e "run" movement action (4x land speed, straight line only).
    CONFIG.Token.movement.actions[RUN_MOVEMENT_ACTION] = buildRunMovementActionConfig();

    // Only offer movement actions the actor's system.speed actually supports.
    for (const action of Object.keys(SPEED_GATED_ACTIONS)) {
      CONFIG.Token.movement.actions[action].canSelect = (token) =>
        canSelectSpeedGatedMovementAction(token.actor as ActorDnd35e | null, action);
    }
    // Disable movement actions with no implemented rule yet (see WISHLIST.md).
    for (const action of DISABLED_MOVEMENT_ACTIONS) {
      CONFIG.Token.movement.actions[action].canSelect = () => false;
    }

    Object.assign(CONFIG.Actor.dataModels, {
      [characterActorType]: CharacterSystemModel,
    });

    // Register character sheet
    foundry.documents.collections.Actors.registerSheet(SYSTEM_ID, CharacterSheet, {
      types: [characterActorType],
      makeDefault: true,
      label: 'dnd35e.ACTOR.sheet.Character',
    });

    // Register familiar schemas for formula resolution
    registerFamiliarSchema('Actor', characterActorType, (ctx?) => gatherAspectsFromSchema(CharacterSystemModel, ctx));

    // Register remaining types with the base schema for now (stubs — full models added in Phase 23)
    for (const type of ACTOR_TYPES) {
      if (type === characterActorType) continue;
      registerFamiliarSchema('Actor', type, (ctx?) => gatherAspectsFromSchema(CharacterSystemModel, ctx));
    }
  });
};
