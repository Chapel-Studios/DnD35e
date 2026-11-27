import type { AmmoItemType } from '@items/itemTypes.mjs';

import { PhysicalItem, type PhysicalItemSourceProps } from '../physicalItem/PhysicalItem.mjs';
import type { AmmoSystemData, AmmoSystemSource } from './data/AmmoSystemData.mjs';

type AmmoSource = Omit<foundry.documents.ItemSource, 'system'>
  & Omit<PhysicalItemSourceProps, 'system'>
  & { system: AmmoSystemSource; };

class Ammo extends PhysicalItem {
  declare system: AmmoSystemData;
  declare type: AmmoItemType;
}

type AmmoType = Ammo;

export type { AmmoSource, AmmoType };
export { Ammo };
