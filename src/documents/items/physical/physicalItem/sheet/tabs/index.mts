import type { SheetTab } from '@documents/document/index.mjs';
import { defaultEffectsTab } from '@items/baseItem/sheet/tabs/index.mjs';

import PhysicalItemEffects from './PhysicalItemEffects.vue';

const physicalItemEffectsTab: SheetTab = {
  ...defaultEffectsTab,
  component: PhysicalItemEffects,
};

export {
  PhysicalItemEffects,
  physicalItemEffectsTab,
};
