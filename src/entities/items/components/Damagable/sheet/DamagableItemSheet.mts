import { BaseItemSheetRenderContext } from "@items/baseItem/index.mjs";
import { DamagableItem } from "../DamagableItem.mjs";

type DamagableItemSheetRenderContext = BaseItemSheetRenderContext & {
  document: DamagableItem;
};

export type { DamagableItemSheetRenderContext };