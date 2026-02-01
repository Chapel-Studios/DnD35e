import { PHYSICAL_ITEM_TYPES } from './constants.mjs';
import { applyPhysicalSchema } from './applyPhysicalSchema.mjs';

import type { PhysicalItemType } from './constants.mjs';
import type {
  PhysicalItemSystemSource,
  PhysicalItemSystemData,
} from './PhysicalSystemData.mjs';

export type {
  PhysicalItemType,
  PhysicalItemSystemSource,
  PhysicalItemSystemData,
};

export {
  applyPhysicalSchema,
  PHYSICAL_ITEM_TYPES,
};
