import { SheetTab } from '@ec/CoreMixin/index.mjs';
import { WeaponDetails } from '@items/weapon/index.mjs';

const weaponDetailsTab: SheetTab = {
  id: 'weapon-details',
  label: 'TYPES.Item.weaponDetails',
  component: () => WeaponDetails,
  order: 40,
};

export {
  weaponDetailsTab,
};
