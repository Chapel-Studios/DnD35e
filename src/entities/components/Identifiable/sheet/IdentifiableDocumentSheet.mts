import type { IdentifiableDocument, IdentifiableDocumentLike } from '@ec/Identifiable/index.mjs';
import type { BaseItemSheetRenderContext } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/itemTypes.mjs';

type IdentifiableDocumentSheetRenderContext = BaseItemSheetRenderContext<ItemType, IdentifiableDocumentLike> & {
  document: IdentifiableDocument;
};

export type { IdentifiableDocumentSheetRenderContext };
