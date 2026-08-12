import type { SheetTab } from '@documents/document/index.mjs';

import WeaponDetails from './WeaponDetails.vue';

const weaponDetailsTab: SheetTab = {
  id: 'details',
  label: 'dnd35e.COMMON.Details',
  component: WeaponDetails,
  order: 40,
};

export {
  WeaponDetails,
  weaponDetailsTab,
};
