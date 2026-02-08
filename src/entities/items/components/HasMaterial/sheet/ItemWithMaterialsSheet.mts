import { BaseItemSheetRenderContext } from '@items/baseItem/index.mjs';
import { ItemWithMaterials } from '@items/components/HasMaterial/index.mjs';

type ItemWithMaterialsSheetRenderContext = BaseItemSheetRenderContext & {
  document: ItemWithMaterials;
};

export type { ItemWithMaterialsSheetRenderContext };
