import type { SheetTab } from '@documents/document/index.mjs';

import WeaponActionsTab from './WeaponActionsTab.vue';
import WeaponDetails from './WeaponDetails.vue';

const weaponDetailsTab: SheetTab = {
  id: 'details',
  label: 'dnd35e.COMMON.Details',
  component: WeaponDetails,
  order: 40,
};

const weaponActionsTab: SheetTab = {
  id: 'actions',
  label: 'dnd35e.WEAPON.ACTIONS.TabLabel',
  component: WeaponActionsTab,
  order: 45,
};

export {
  WeaponActionsTab,
  weaponActionsTab,
  WeaponDetails,
  weaponDetailsTab,
};
