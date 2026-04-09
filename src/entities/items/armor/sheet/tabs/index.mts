import type { SheetTab } from '@ec/CoreMixin/index.mjs';

import WeaponDetails from './ArmorDetails.vue';

const weaponDetailsTab: SheetTab = {
  id: 'details',
  label: 'TYPES.Item.weaponDetails',
  component: WeaponDetails,
  order: 40,
};

export {
  WeaponDetails,
  weaponDetailsTab,
};
