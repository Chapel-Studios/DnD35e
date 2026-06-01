import { characterActorType } from '@actors/actorTypes.mjs';
import { ActorProxyDnd35e } from '@actors/baseActor/index.mjs';
import { CharacterSystemModel } from '@actors/character/index.mjs';
import { CharacterSheet } from '@actors/character/sheet/CharacterSheet.mjs';
import { ActorConfig } from '@constants/config/actor.mjs';
import type { DocumentSheetStore } from '@documents/document/index.mjs';
import type { NameFormulaDocument } from '@documents/document/logic/index.mjs';
import { ensureNameFormulaOnCreate } from '@documents/document/logic/index.mjs';
import { gatherAspectsFromSchema, registerFamiliarSchema } from '@helpers/formulae/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import { ACTOR_TYPES } from './actorTypes.mjs';

export const registerActors = () => {
  CONFIG.dnd35e.actor = {
    ...CONFIG.dnd35e.actor,
    ...ActorConfig,
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

  Hooks.on('preCreateActor', (document, _data, _options, _userId) => {
    ensureNameFormulaOnCreate(document as NameFormulaDocument);
  });

  Hooks.on('updateActor', (document, _updateData, _options, _userId) => {
    if (!document._id || !game.dnd35e?.stores?.[document.documentName]?.[document._id]) return;
    (game.dnd35e.stores[document.documentName]?.[document._id] as DocumentSheetStore<any>)?._storeUtils.refreshDocument?.(document);
  });
};
