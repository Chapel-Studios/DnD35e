import type { SheetTab } from '@ec/CoreMixin/index.mjs';

import WeaponDetails from './WeaponDetails.vue';

const weaponDetailsTab: SheetTab = {
  id: 'weapon-details',
  label: 'TYPES.Item.weaponDetails',
  component: WeaponDetails,
  order: 40,
};

export {
  WeaponDetails,
  weaponDetailsTab,
};
