import { IdentifiableItem } from "../IdentifiableItem.mjs";
import { BaseItemSheetRenderContext } from "@items/baseItem/index.mjs";

type IdentifiableItemSheetRenderContext = BaseItemSheetRenderContext & {
  document: IdentifiableItem;
};

export type { IdentifiableItemSheetRenderContext };
