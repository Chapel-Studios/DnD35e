import type { SheetTab } from '@documents/document/index.mjs';

import ArmorDetails from './ArmorDetails.vue';

const armorDetailsTab: SheetTab = {
  id: 'details',
  label: 'TYPES.Item.armorDetails',
  component: ArmorDetails,
  order: 40,
};

export {
  ArmorDetails,
  armorDetailsTab,
};
