import { IdentifiableItemSheetRenderContext } from "@items/components/Identifiable/index.mjs";
import PhysicalItemSheet from "./PhysicalItemSheet.vue";
import { PhysicalItem } from "../PhysicalItemDnd35e.mjs";
import ItemHP from './components/ItemHP.vue';
import ItemHardness from './components/ItemHardness.vue';

export { usePhysicalItemStore } from "./PhysicalItemStore.mjs";
export {
  PhysicalItemSheet,
  ItemHP,
  ItemHardness,
};

export type { PhysicalItemSheetStore } from "./PhysicalItemStore.mjs";
export type PhysicalItemSheetRenderContext = IdentifiableItemSheetRenderContext & {
  document: PhysicalItem;
}