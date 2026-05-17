import type { SheetTab } from '@ec/CoreMixin/index.mjs';

import ItemEffects from './ItemEffects.vue';

const defaultEffectsTab: SheetTab = {
  id: 'effects',
  label: 'dnd35e.EFFECT.Effects',
  component: ItemEffects,
  order: 100,
  icon: 'fas fa-bolt',
};

export {
  defaultEffectsTab,
  ItemEffects,
};
