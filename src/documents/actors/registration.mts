import { characterActorType } from '@actors/actorTypes.mjs';
import { ActorProxyDnd35e } from '@actors/baseActor/index.mjs';
import { Character, CharacterSystemModel } from '@actors/character/index.mjs';
import { CharacterSheet } from '@actors/character/sheet/CharacterSheet.mjs';
import { gatherAspectsFromSchema, registerFamiliarSchema } from '@helpers/formulae/index.mjs';
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
