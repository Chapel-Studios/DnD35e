import type { SheetTab } from '@ec/CoreMixin/index.mjs';

import Description from './Description.vue';
import Effects from './Effects.vue';

const defaultDescriptionTab: SheetTab = {
  id: 'description',
  label: 'D35E.Description',
  component: Description,
  order: 10,
};

const defaultEffectsTab: SheetTab = {
  id: 'effects',
  label: 'D35E.Effects',
  component: Effects,
  order: 100,
  icon: 'fas fa-bolt',
};

export {
  defaultDescriptionTab,
  defaultEffectsTab,
  Description,
  Effects,
};
