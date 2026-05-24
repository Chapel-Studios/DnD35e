import type { SheetTab } from '@documents/document/index.mjs';

import AbilitiesTab from './AbilitiesTab.vue';
import BiographyTab from './BiographyTab.vue';
import FeaturesTab from './FeaturesTab.vue';
import InventoryTab from './InventoryTab.vue';

const abilitiesTab: SheetTab = {
  id: 'abilities',
  label: 'dnd35e.ACTOR.tab.Abilities',
  component: AbilitiesTab,
  order: 10,
  icon: 'fas fa-fist-raised',
};

const inventoryTab: SheetTab = {
  id: 'inventory',
  label: 'dnd35e.ACTOR.tab.Inventory',
  component: InventoryTab,
  order: 20,
  icon: 'fas fa-backpack',
};

const featuresTab: SheetTab = {
  id: 'features',
  label: 'dnd35e.ACTOR.tab.Features',
  component: FeaturesTab,
  order: 30,
  icon: 'fas fa-star',
};

const biographyTab: SheetTab = {
  id: 'biography',
  label: 'dnd35e.ACTOR.tab.Biography',
  component: BiographyTab,
  order: 50,
  icon: 'fas fa-book-open',
};

export { abilitiesTab, biographyTab, featuresTab, inventoryTab };
