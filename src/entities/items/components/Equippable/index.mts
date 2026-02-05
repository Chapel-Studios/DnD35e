import type { EquippableItemSystemData, EquippableItemSystemSource } from './data/index.mjs';
import { applyEquippableSchema } from './data/index.mjs';

import {
  applyEquippablePrototype,
  equippableOverrides,
} from './EquippableItem.mjs';

import type {
  EquippableItemSourceProps,
  EquippableItem,
  EquippableItemLike,
  EquippableItemSource,
} from './EquippableItem.mjs';

export type {
  EquippableItemSystemData,
  EquippableItemSystemSource,
  EquippableItemSourceProps,
  EquippableItem,
  EquippableItemLike,
  EquippableItemSource,
};
export {
  applyEquippableSchema,
  applyEquippablePrototype,
  equippableOverrides,
};
