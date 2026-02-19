import type { IdentifiableItem, IdentifiableItemLike } from '@ec/Identifiable/index.mjs';
import type { BaseItemSheetRenderContext } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/itemTypes.mjs';

type IdentifiableItemSheetRenderContext = BaseItemSheetRenderContext<ItemType, IdentifiableItemLike> & {
  document: IdentifiableItem;
};

export type { IdentifiableItemSheetRenderContext };
