import { characterActorType } from '@actors/actorTypes.mjs';
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { ActorProxyDnd35e } from '@actors/baseActor/index.mjs';
import { Character, CharacterSystemModel } from '@actors/character/index.mjs';
import { CharacterSheet } from '@actors/character/sheet/CharacterSheet.mjs';
import { AmbientLightDnd35e } from '@canvas/light/AmbientLightDnd35e.mjs';
import {
  buildDropProneMovementActionConfig,
  buildRunMovementActionConfig,
  buildStandUpMovementActionConfig,
  canSelectCrawlMovementAction,
  canSelectDropProneMovementAction,
  canSelectGroundMovementAction,
  canSelectSpeedGatedMovementAction,
  canSelectStandUpMovementAction,
  DISABLED_MOVEMENT_ACTIONS,
  DROP_PRONE_MOVEMENT_ACTION,
  GROUND_MOVEMENT_ACTIONS,
  RUN_MOVEMENT_ACTION,
  SPEED_GATED_ACTIONS,
  STAND_UP_MOVEMENT_ACTION,
} from '@canvas/token/logic/movementActionGating.mjs';
import { TokenDnd35e } from '@canvas/token/TokenDnd35e.mjs';
import { TokenRulerDnd35e } from '@canvas/token/TokenRulerDnd35e.mjs';
import { BLINDED_CONDITION_ID, buildConditionStatusEffects } from '@constants/conditions.mjs';
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
    CONFIG.AmbientLight.objectClass = AmbientLightDnd35e;

    // Register the dnd35e "run" movement action (4x land speed, straight line only).
    CONFIG.Token.movement.actions[RUN_MOVEMENT_ACTION] = buildRunMovementActionConfig();

    // Register the Prone toggle movement actions (see TokenDocumentDnd35e#_onUpdateMovement).
    CONFIG.Token.movement.actions[DROP_PRONE_MOVEMENT_ACTION] = buildDropProneMovementActionConfig();
    CONFIG.Token.movement.actions[STAND_UP_MOVEMENT_ACTION] = buildStandUpMovementActionConfig();

    // Only offer movement actions the actor's system.speed actually supports.
    for (const action of Object.keys(SPEED_GATED_ACTIONS)) {
      CONFIG.Token.movement.actions[action].canSelect = (token) =>
        canSelectSpeedGatedMovementAction(token.actor as ActorDnd35e | null, action);
    }
    // Ground movement (walk/run) is blocked while Prone — must crawl or stand up.
    for (const action of GROUND_MOVEMENT_ACTIONS) {
      const existingCanSelect = CONFIG.Token.movement.actions[action].canSelect ?? (() => true);
      CONFIG.Token.movement.actions[action].canSelect = (token) =>
        canSelectGroundMovementAction(token.actor as ActorDnd35e | null) && existingCanSelect(token);
    }
    // Crawl is only selectable while Prone.
    CONFIG.Token.movement.actions.crawl.canSelect = (token) =>
      canSelectCrawlMovementAction(token.actor as ActorDnd35e | null);
    // Foundry's default `crawl` action assumes a 5e-style "costs double movement" rule
    // (costMultiplier: 2, resolved to getCostFunction: cost => cost * 2). SRD crawling
    // is a flat 5 ft. with no cost penalty (Prone's `system.speed.land` OVERRIDE already
    // caps the budget at 5 ft. — see conditions.mts) — undo the doubling.
    CONFIG.Token.movement.actions.crawl.getCostFunction = () => (cost) => cost;
    // Drop Prone / Stand Up are mutually exclusive with the current Prone state.
    CONFIG.Token.movement.actions[DROP_PRONE_MOVEMENT_ACTION].canSelect = (token) =>
      canSelectDropProneMovementAction(token.actor as ActorDnd35e | null);
    CONFIG.Token.movement.actions[STAND_UP_MOVEMENT_ACTION].canSelect = (token) =>
      canSelectStandUpMovementAction(token.actor as ActorDnd35e | null);
    // Disable movement actions with no implemented rule yet (see WISHLIST.md).
    for (const action of DISABLED_MOVEMENT_ACTIONS) {
      CONFIG.Token.movement.actions[action].canSelect = () => false;
    }

    // Register SRD conditions as Token HUD status effects (see conditions.mts for scope notes).
    // `CONFIG.statusEffects` is a Proxy keyed by id (its `ownKeys` trap maps entries to their
    // `.id`s) — assigning by id (Foundry's own registration idiom) replaces same-id defaults
    // (our `prone`/`invisible`/`unconscious` intentionally supersede core's) instead of
    // `.push()`ing a duplicate `.id`, which corrupts the Proxy's `ownKeys` invariant and
    // crashes `TextureLoader.loadSceneTextures`.
    for (const status of buildConditionStatusEffects()) {
      (CONFIG.statusEffects as unknown as Record<string, typeof status>)[status.id] = status;
    }
    // Blinded gets Foundry's native vision-loss behavior for free.
    CONFIG.specialStatusEffects.BLIND = BLINDED_CONDITION_ID;

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
