import type {
  HasMaterialsSystemSource,
  HasMaterialsSystemData,
} from './data/index.mjs';
import type {
  ItemWithMaterialsSheetRenderContext,
  ItemWithMaterialsStore,
} from './sheet/index.mjs';
import type {
  ItemWithMaterials,
  ItemWithMaterialsLike,
  ItemWithMaterialsSource,
  ItemWithMaterialsSourceProps,
} from './ItemWithMaterials.mjs';

import { applyHasMaterialsSchema } from './data/index.mjs';
import { useItemWithMaterialsStore } from './sheet/index.mjs';

export {
  applyHasMaterialsSchema,
  useItemWithMaterialsStore,
};

export type {
  HasMaterialsSystemSource,
  HasMaterialsSystemData,
  ItemWithMaterials,
  ItemWithMaterialsLike,
  ItemWithMaterialsSource,
  ItemWithMaterialsSourceProps,
  ItemWithMaterialsSheetRenderContext,
  ItemWithMaterialsStore,
};
