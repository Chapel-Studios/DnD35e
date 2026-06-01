import type { ActorStore } from '@actors/baseActor/sheet/index.mjs';
import { useActorSheetStore } from '@actors/baseActor/sheet/index.mjs';
import { Character } from '@actors/character/Character.mjs';
import type { CreatureGetters, CreatureStore } from '@actors/creature/sheet/CreatureStore.mjs';
import { useCreatureStore } from '@actors/creature/sheet/CreatureStore.mjs';
import {
  attributesTab,
  buffsTab,
  combatTab,
  featuresTab,
  inventoryTab,
  notesTab,
  skillsTab,
  spellsTab,
  summaryTab,
} from '@actors/creature/sheet/tabs/index.mjs';
import type { DocumentSheetStore } from '@documents/document/index.mjs';
import { useDocumentSheetStore } from '@documents/document/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

/**
 * Leaf store for the Character sheet. Builds the base document store, layers the
 * actor and creature overlays on top, and adds character-specific named getters.
 */
const useCharacterStore = (
  context: VueApplicationContext<Character>
): CharacterDocumentStore => {
  const baseStore = useDocumentSheetStore(context, {
    defaultTabs: [summaryTab, attributesTab, combatTab, inventoryTab, featuresTab, skillsTab, buffsTab, spellsTab, notesTab],
    defaultActiveTab: 'summary',
  });
  const { document } = baseStore._storeUtils;

  const actorStore    = useActorSheetStore(context, baseStore);
  const creatureStore = useCreatureStore(context, baseStore);

  const documentGetters: CharacterGetters = {
    ...baseStore.documentGetters,
    ...actorStore.documentGetters,
    ...creatureStore.documentGetters,

    xpValue:       computed(() => document.value.system.xp?.value ?? 0),
    isPartyMember: computed(() => document.value.system.isPartyMember ?? false),
  };

  const documentActions = {
    ...baseStore.documentActions,
    ...actorStore.documentActions,
    ...creatureStore.documentActions,
  };

  const _storeUtils = {
    ...baseStore._storeUtils,
    ...actorStore._storeUtils,
    ...creatureStore._storeUtils,
  };

  const providedStore = {
    ...baseStore,
    ...actorStore,
    ...creatureStore,
    documentGetters,
    documentActions,
    _storeUtils,
  } as CharacterDocumentStore;

  game.dnd35e.stores[document.value.documentName][context.document.id] = providedStore;

  return providedStore;
};

interface CharacterGetters extends CreatureGetters {
  xpValue:        ComputedRef<number>;
  isPartyMember:  ComputedRef<boolean>;
}

interface CharacterDocumentStore
  extends DocumentSheetStore<Character>, ActorStore, CreatureStore {
  documentGetters: CharacterGetters
    & ActorStore['documentGetters']
    & DocumentSheetStore<Character>['documentGetters'];
  documentActions: DocumentSheetStore<Character>['documentActions'];
  _storeUtils: DocumentSheetStore<Character>['_storeUtils'];
}

export { useCharacterStore };
export type { CharacterDocumentStore, CharacterGetters };
