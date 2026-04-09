import { BaseItemSheetRenderContext } from '@items/baseItem/index.mjs';
import { EquippableItem, EquippableItemLike } from '@items/components/Equippable/index.mjs';
import { PhysicalItemSheetRenderContext } from '@items/components/Physical/index.mjs';
import { EquippableItemType } from '@items/index.mjs';

type EquippableItemSheetRenderContext = BaseItemSheetRenderContext<EquippableItemType, EquippableItemLike>
  & PhysicalItemSheetRenderContext
  & {
    document: EquippableItem;
  };

export type { EquippableItemSheetRenderContext };
