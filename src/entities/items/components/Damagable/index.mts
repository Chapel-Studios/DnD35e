import type {
  DamagableItemSystemSource,
  DamagableItemSystemData,
} from './data/index.mjs';
import type {
  DamagableItemSourceProps,
  DamagableItemSource,
  DamagableItem,
  DamagableItemLike,
} from './DamagableItem.mjs';
import type {
  DamagableItemSheetRenderContext,
  DamagableItemStore,
} from './sheet/index.mjs';

import {
  applyDamagableSchema,
} from './data/index.mjs';
import {
  applyDamagableRuntime,
} from './DamagableItem.mjs';
import {
  useDamagableItemStore,
} from './sheet/index.mjs';

export type {
  DamagableItemSystemSource,
  DamagableItemSystemData,
  DamagableItemSourceProps,
  DamagableItemSource,
  DamagableItem,
  DamagableItemLike,
  DamagableItemSheetRenderContext,
  DamagableItemStore,
};

export {
  applyDamagableSchema,
  applyDamagableRuntime,
  useDamagableItemStore,
};