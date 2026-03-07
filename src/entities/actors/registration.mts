import { registerIntellisenseSchema } from '@helpers/formulae/index.mjs';

import { ACTOR_TYPES } from './actorTypes.mjs';
import { buildBaseActorIntellisense } from './baseActor/data/actorIntellisense.mjs';

export const registerActors = () => {
  foundry.helpers.Hooks.once('init', () => {
    // Register intellisense schemas for every actor type.
    // All share the same base schema for now; individual types will diverge
    // once actor TypeDataModels are introduced.
    for (const type of ACTOR_TYPES) {
      registerIntellisenseSchema('Actor', type, buildBaseActorIntellisense);
    }
  });
};
