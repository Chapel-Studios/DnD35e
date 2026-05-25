import { CreatureSheet } from '@actors/creature/sheet/CreatureSheet.mjs';

import CharacterSheetVue from './CharacterSheet.vue';

class CharacterSheet extends CreatureSheet {
  get vueComponent () {
    return CharacterSheetVue;
  }
}

export { CharacterSheet };
