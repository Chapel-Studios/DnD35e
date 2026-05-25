import type { SheetTab } from '@documents/document/index.mjs';

import AttributesTab from './AttributesTab.vue';
import BuffsTab from './BuffsTab.vue';
import CharacterDescriptionTab from './CharacterDescriptionTab.vue';
import CombatTab from './CombatTab.vue';
import FeaturesTab from './FeaturesTab.vue';
import InventoryTab from './InventoryTab.vue';
import SkillsTab from './SkillsTab.vue';
import SpellsTab from './SpellsTab.vue';
import SummaryTab from './SummaryTab.vue';

const summaryTab: SheetTab = {
  id: 'summary',
  label: 'dnd35e.ACTOR.tab.Summary',
  component: SummaryTab,
  order: 10,
  icon: 'fas fa-address-card',
};

const attributesTab: SheetTab = {
  id: 'attributes',
  label: 'dnd35e.ACTOR.tab.Attributes',
  component: AttributesTab,
  order: 20,
  icon: 'fas fa-fist-raised',
};

const combatTab: SheetTab = {
  id: 'combat',
  label: 'dnd35e.ACTOR.tab.Combat',
  component: CombatTab,
  order: 30,
  icon: 'fas fa-shield-halved',
};

const inventoryTab: SheetTab = {
  id: 'inventory',
  label: 'dnd35e.ACTOR.tab.Inventory',
  component: InventoryTab,
  order: 40,
  icon: 'fas fa-backpack',
};

const featuresTab: SheetTab = {
  id: 'features',
  label: 'dnd35e.ACTOR.tab.Features',
  component: FeaturesTab,
  order: 50,
  icon: 'fas fa-star',
};

const skillsTab: SheetTab = {
  id: 'skills',
  label: 'dnd35e.ACTOR.tab.Skills',
  component: SkillsTab,
  order: 60,
  icon: 'fas fa-scroll',
};

const buffsTab: SheetTab = {
  id: 'buffs',
  label: 'dnd35e.ACTOR.tab.Buffs',
  component: BuffsTab,
  order: 70,
  icon: 'fas fa-bolt',
};

const spellsTab: SheetTab = {
  id: 'spells',
  label: 'dnd35e.ACTOR.tab.Spells',
  component: SpellsTab,
  order: 80,
  icon: 'fas fa-hat-wizard',
};

const notesTab: SheetTab = {
  id: 'notes',
  label: 'dnd35e.ACTOR.tab.Notes',
  component: CharacterDescriptionTab,
  order: 90,
  icon: 'fas fa-book-open',
};

export {
  attributesTab,
  buffsTab,
  combatTab,
  featuresTab,
  inventoryTab,
  notesTab,
  skillsTab,
  spellsTab,
  summaryTab,
};

