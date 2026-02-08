import { BaseItemSheetRenderContext } from '@items/baseItem/index.mjs';
import { EquippableItem } from '@items/components/Equippable/index.mjs';
import { PhysicalItemSheetRenderContext } from '@items/components/Physical/index.mjs';

type EquippableItemSheetRenderContext = BaseItemSheetRenderContext
  & PhysicalItemSheetRenderContext
  // & HasMaterialsSheetRenderContext
  &
{
  document: EquippableItem;
};

export type { EquippableItemSheetRenderContext };
