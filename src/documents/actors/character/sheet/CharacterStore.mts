import { Character } from '@actors/character/Character.mjs';
import type { CreatureDocumentStore } from '@actors/creature/sheet/CreatureStore.mjs';
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
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

/**
 * Leaf store for Character documents. Builds on the creature store and adds
 * character-specific getters; self-registration in `game.dnd35e.stores` happens
 * here last (overwriting any registration from upstream layers).
 */
const useCharacterStore = (
  context: VueApplicationContext<Character>
): CharacterDocumentStore => {
  const creatureStore = useCreatureStore<Character>(context, {
    defaultTabs: [summaryTab, attributesTab, combatTab, inventoryTab, featuresTab, skillsTab, buffsTab, spellsTab, notesTab],
    defaultActiveTab: 'summary',
  });
  const { document } = creatureStore._storeUtils;

  const documentGetters = {
    ...creatureStore.documentGetters,
    xpValue:       computed(() => document.value.system.xp?.value ?? 0),
    isPartyMember: computed(() => document.value.system.isPartyMember ?? false),
  };

  const store: CharacterDocumentStore = {
    ...creatureStore,
    documentGetters,
  };

  game.dnd35e.stores[document.value.documentName][context.document.id] = store;

  return store;
};

interface CharacterGetters {
  xpValue:        ComputedRef<number>;
  isPartyMember:  ComputedRef<boolean>;
}

type CharacterDocumentStore = CreatureDocumentStore<Character> & {
  documentGetters: CreatureDocumentStore<Character>['documentGetters'] & CharacterGetters;
};

export { useCharacterStore };
export type { CharacterDocumentStore, CharacterGetters };
