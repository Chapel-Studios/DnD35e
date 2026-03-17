import { SheetTab } from '@ec/CoreMixin/index.mjs';
import { defaultEffectsTab } from '@items/baseItem/index.mjs';

import PhysicalItemEffects from './PhysicalItemEffects.vue';

const physicalItemEffectsTab: SheetTab = {
  ...defaultEffectsTab,
  component: PhysicalItemEffects,
};

export {
  PhysicalItemEffects,
  physicalItemEffectsTab,
};
