import {
  applyPhysicalPrototype,
  physicalOverrides,
} from './PhysicalItemDnd35e.mjs';
import {
  PhysicalItemSheet,
  usePhysicalItemStore,
  ItemHP,
  ItemHardness,
} from './sheet/index.mjs';
import {
  applyPhysicalSchema,
  PHYSICAL_ITEM_TYPES,
} from './data/index.mjs';

import type {
  PhysicalItemSourceProps,
  PhysicalItemSource,
  PhysicalItem,
  PhysicalItemLike,
} from './PhysicalItemDnd35e.mjs';
import type {
  PhysicalItemType,
  PhysicalItemSystemSource,
  PhysicalItemSystemData,
} from './data/index.mjs';
import type {
  PhysicalItemSheetRenderContext,
  PhysicalItemSheetStore,
} from './sheet/index.mjs';

export {
  applyPhysicalPrototype,
  physicalOverrides,
  PhysicalItemSheet,
  applyPhysicalSchema,
  PHYSICAL_ITEM_TYPES,
  usePhysicalItemStore,
  ItemHP,
  ItemHardness,
};

export type {
  PhysicalItemSourceProps,
  PhysicalItemSource,
  PhysicalItem,
  PhysicalItemLike,
  PhysicalItemType,
  PhysicalItemSystemSource,
  PhysicalItemSystemData,
  PhysicalItemSheetRenderContext,
  PhysicalItemSheetStore,
};
