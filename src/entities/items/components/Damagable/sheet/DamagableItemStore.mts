import { ItemSheetStore } from "@items/baseItem/index.mjs";
import type {
  DamagableItemLike,
  DamagableItemSheetRenderContext,
} from "@items/components/Damagable/index.mjs";
import type { Ref } from "vue";

const useDamagableItemStore = <TDocument extends DamagableItemLike> (context: DamagableItemSheetRenderContext, baseStore: ItemSheetStore<TDocument>) => {
  const document = baseStore._document as unknown as Ref<DamagableItemLike>;

  return {

  };
};

interface DamagableItemStore<TDocument extends DamagableItemLike = DamagableItemLike> extends ReturnType<typeof useDamagableItemStore>, ItemSheetStore<TDocument> {};

export {
  useDamagableItemStore,
};

export type {
  DamagableItemStore,
};
