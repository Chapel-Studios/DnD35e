import { characterActorType } from '@actors/actorTypes.mjs';
import { ActorProxyDnd35e } from '@actors/baseActor/index.mjs';
import { CharacterSystemModel } from '@actors/character/index.mjs';
import { gatherAspectsFromSchema, registerFamiliarSchema } from '@helpers/formulae/index.mjs';

import { ACTOR_TYPES } from './actorTypes.mjs';

export const registerActors = () => {
  foundry.helpers.Hooks.once('init', () => {
    CONFIG.Actor.documentClass = ActorProxyDnd35e;

    Object.assign(CONFIG.Actor.dataModels, {
      [characterActorType]: CharacterSystemModel,
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
