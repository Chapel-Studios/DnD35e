import { IdentifiableItemSheetRenderContext } from "@items/components/Identifiable/index.mjs";
import PhysicalItemSheet from "./PhysicalItemSheet.vue";
import { PhysicalItem } from "../PhysicalItemDnd35e.mjs";

export { usePhysicalItemStore } from "./PhysicalItemStore.mjs";
export {
  PhysicalItemSheet,
};

export type { PhysicalItemSheetStore } from "./PhysicalItemStore.mjs";
export type PhysicalItemSheetRenderContext = IdentifiableItemSheetRenderContext & {
  document: PhysicalItem;
}