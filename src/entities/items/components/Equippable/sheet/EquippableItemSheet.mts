import type { BaseItemSheetRenderContext } from '@items/baseItem/index.mjs';
import type { EquippableItemLike } from '@items/components/Equippable/index.mjs';
import { EquippableItem } from '@items/components/Equippable/index.mjs';
import type { PhysicalItemSheetRenderContext } from '@items/components/Physical/index.mjs';
import type { EquippableItemType } from '@items/index.mjs';

type EquippableItemSheetRenderContext = BaseItemSheetRenderContext<EquippableItemType, EquippableItemLike>
  & PhysicalItemSheetRenderContext
  & {
    document: EquippableItem;
  };

export type { EquippableItemSheetRenderContext };
