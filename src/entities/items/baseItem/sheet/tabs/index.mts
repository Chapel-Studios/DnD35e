import type { SheetTab } from '@ec/CoreMixin/index.mjs';

import Effects from './Effects.vue';

const defaultEffectsTab: SheetTab = {
  id: 'effects',
  label: 'dnd35e.EFFECT.Effects',
  component: Effects,
  order: 100,
  icon: 'fas fa-bolt',
};

export {
  defaultEffectsTab,
  Effects,
};
