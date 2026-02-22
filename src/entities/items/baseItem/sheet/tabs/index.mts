import type { SheetTab } from '@ec/CoreMixin/index.mjs';

import Details from './Details.vue';
import Effects from './Effects.vue';

const defaultDescriptionTab: SheetTab = {
  id: 'details',
  label: 'D35E.Description',
  component: Details,
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
  Details,
  Effects,
};
