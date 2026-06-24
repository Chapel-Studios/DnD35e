import CreatureDescriptionTab from '@actors/creature/sheet/tabs/CreatureDescriptionTab.vue';
import type { SheetTab } from '@documents/document/index.mjs';

import CharacterDescriptionTab from './CharacterDescriptionTab.vue';

const characterBioTab: SheetTab = {
  ...CreatureDescriptionTab,
  id: 'notes',
  label: 'dnd35e.ACTOR.tab.Bio',
  tooltip: 'dnd35e.ACTOR.tab.Bio',
  component: CharacterDescriptionTab,
  order: 80,
  icon: 'fas fa-book-open',
};

export {
  characterBioTab,
  CharacterDescriptionTab,
};