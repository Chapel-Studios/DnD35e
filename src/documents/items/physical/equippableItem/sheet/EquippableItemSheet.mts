import type { BaseItemSheetRenderContext } from '@items/baseItem/index.mjs';
import type { EquippableItemType } from '@items/index.mjs';
import type { EquippableItemLike } from '@items/physical/equippableItem/index.mjs';
import type { PhysicalItemSheetRenderContext } from '@items/physical/physicalItem/index.mjs';

import { EquippableItem } from '../EquippableItem.mjs';

type EquippableItemSheetRenderContext = BaseItemSheetRenderContext<EquippableItemType, EquippableItemLike>
  & PhysicalItemSheetRenderContext
  & {
    document: EquippableItem;
  };

export type { EquippableItemSheetRenderContext };
