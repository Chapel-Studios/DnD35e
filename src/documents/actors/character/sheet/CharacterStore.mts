import { Character } from '@actors/character/Character.mjs';
import type { CreatureDocumentStore } from '@actors/creature/sheet/CreatureStore.mjs';
import { useCreatureStore } from '@actors/creature/sheet/CreatureStore.mjs';
import {
  attributesTab,
  bioTab,
  buffsTab,
  combatTab,
  featuresTab,
  inventoryTab,
  notesTab,
  settingsTab,
  skillsTab,
  spellsTab,
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
): CharacterStore => {
  const creatureStore = useCreatureStore<Character>(context, {
    defaultTabs: [attributesTab, combatTab, inventoryTab, featuresTab, skillsTab, buffsTab, spellsTab, bioTab, notesTab, settingsTab],
    defaultActiveTab: 'attributes',
  });
  const { document } = creatureStore._storeUtils;

  const documentGetters = {
    ...creatureStore.documentGetters,

    classShorthand: computed(() => document.value.classShorthand ?? ''),
    xpValue:       computed(() => document.value.system.xp?.value ?? 0),
    isPartyMember: computed(() => document.value.system.settings.isPartyMember ?? false),
  };

  const store: CharacterStore = {
    ...creatureStore,
    documentGetters,
  };

  game.dnd35e.stores[document.value.documentName][context.document.id] = store;

  return store;
};

interface CharacterGetters {
  classShorthand: ComputedRef<string>;
  xpValue:        ComputedRef<number>;
  isPartyMember:  ComputedRef<boolean>;
}

type CharacterStore = CreatureDocumentStore<Character> & {
  documentGetters: CreatureDocumentStore<Character>['documentGetters'] & CharacterGetters;
};

export { useCharacterStore };
export type { CharacterGetters,CharacterStore };
