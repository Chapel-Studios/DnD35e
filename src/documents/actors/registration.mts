import { DOCUMENT_LEVEL_ASPECTS, registerFamiliarSchema } from '@helpers/formulae/index.mjs';
import type { AspectGroup } from '@helpers/formulae/types.mjs';

import { ACTOR_TYPES } from './actorTypes.mjs';

/** Minimal familiar for actors: only document-level fields (name). */
const buildBaseActorFamiliar = (): AspectGroup => ({ ...DOCUMENT_LEVEL_ASPECTS });

export const registerActors = () => {
  foundry.helpers.Hooks.once('init', () => {
    // Register familiar schemas for every actor type.
    // All share the same base schema for now; individual types will diverge
    // once actor TypeDataModels are introduced.
    for (const type of ACTOR_TYPES) {
      registerFamiliarSchema('Actor', type, buildBaseActorFamiliar);
    }
  });
};
