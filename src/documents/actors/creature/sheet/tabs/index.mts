import type { SheetTab } from '@documents/document/index.mjs';

import AttributesTab from './AttributesTab.vue';
import BioTab from './bio/BioTab.vue';
import BuffsTab from './BuffsTab.vue';
import CharacterDescriptionTab from './CharacterDescriptionTab.vue';
import CombatTab from './CombatTab.vue';
import FeaturesTab from './FeaturesTab.vue';
import InventoryTab from './InventoryTab.vue';
import SettingsTab from './SettingsTab.vue';
import SkillsTab from './SkillsTab.vue';
import SpellsTab from './SpellsTab.vue';

const attributesTab: SheetTab = {
  id: 'attributes',
  label: 'dnd35e.ACTOR.tab.Attributes',
  tooltip: 'dnd35e.ACTOR.tab.Attributes',
  component: AttributesTab,
  order: 10,
  icon: 'fas fa-address-card',
};

const combatTab: SheetTab = {
  id: 'combat',
  label: 'dnd35e.ACTOR.tab.Combat',
  tooltip: 'dnd35e.ACTOR.tab.Combat',
  component: CombatTab,
  order: 20,
  icon: 'fas fa-shield-halved',
};

const inventoryTab: SheetTab = {
  id: 'inventory',
  label: 'dnd35e.ACTOR.tab.Inventory',
  tooltip: 'dnd35e.ACTOR.tab.Inventory',
  component: InventoryTab,
  order: 30,
  icon: 'fas fa-backpack',
};

const featuresTab: SheetTab = {
  id: 'features',
  label: 'dnd35e.ACTOR.tab.Features',
  tooltip: 'dnd35e.ACTOR.tab.Features',
  component: FeaturesTab,
  order: 40,
  icon: 'fas fa-star',
};

const skillsTab: SheetTab = {
  id: 'skills',
  label: 'dnd35e.ACTOR.tab.Skills',
  tooltip: 'dnd35e.ACTOR.tab.Skills',
  component: SkillsTab,
  order: 50,
  icon: 'fas fa-scroll',
};

const buffsTab: SheetTab = {
  id: 'buffs',
  label: 'dnd35e.ACTOR.tab.Buffs',
  tooltip: 'dnd35e.ACTOR.tab.Buffs',
  component: BuffsTab,
  order: 60,
  icon: 'fas fa-bolt',
};

const spellsTab: SheetTab = {
  id: 'spells',
  label: 'dnd35e.ACTOR.tab.Spells',
  tooltip: 'dnd35e.ACTOR.tab.Spells',
  component: SpellsTab,
  order: 70,
  icon: 'fas fa-hat-wizard',
};

const notesTab: SheetTab = {
  id: 'notes',
  label: 'dnd35e.ACTOR.tab.Notes',
  tooltip: 'dnd35e.ACTOR.tab.Notes',
  component: CharacterDescriptionTab,
  order: 80,
  icon: 'fas fa-book-open',
};

const bioTab: SheetTab = {
  id: 'bio',
  label: 'dnd35e.ACTOR.tab.Bio',
  tooltip: 'dnd35e.ACTOR.tab.Bio',
  component: BioTab,
  order: 90,
  icon: 'fas fa-user',
};

const settingsTab: SheetTab = {
  id: 'settings',
  label: 'dnd35e.ACTOR.tab.Settings',
  tooltip: 'dnd35e.ACTOR.tab.Settings',
  component: SettingsTab,
  order: 100,
  icon: 'fas fa-cog',
};

export {
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
};

