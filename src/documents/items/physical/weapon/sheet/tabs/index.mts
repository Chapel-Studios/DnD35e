import type { SheetTab } from '@documents/document/index.mjs';

import WeaponDetails from './WeaponDetails.vue';

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
