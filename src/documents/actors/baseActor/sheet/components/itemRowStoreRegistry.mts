import type { DocumentSheetStoreDocumentGetters } from '@documents/document/sheet/DocumentSheetStore.mjs';
import type { RenderModeStore } from '@documents/document/sheet/stores/RenderModeStore.mjs';
import type { PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
import { ammoItemType, containerItemType, weaponItemType } from '@items/itemTypes.mjs';
import { type Ammo, type AmmoStore,useAmmoStore } from '@items/physical/ammo/index.mjs';
import type { Container } from '@items/physical/container/Container.mjs';
import type { ContainerStore } from '@items/physical/container/sheet/ContainerStore.mjs';
import { useContainerStore } from '@items/physical/container/sheet/ContainerStore.mjs';
import type { WeaponStore } from '@items/physical/weapon/sheet/WeaponStore.mjs';
import { useWeaponStore } from '@items/physical/weapon/sheet/WeaponStore.mjs';
import type { Weapon } from '@items/physical/weapon/Weapon.mjs';
import type { VueApplicationConfiguration, VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef, InjectionKey } from 'vue';

type ItemRowStore = WeaponStore
  | ContainerStore
  | AmmoStore;

type InventoryListStore = {
  documentGetters: Pick<DocumentSheetStoreDocumentGetters, 'documentUuid' | 'getIsFieldEditable'> & {
    physicalItems?: ComputedRef<PHYSICAL_ITEMS[]>;
    getOrCreateItemRowStore: (item: PHYSICAL_ITEMS) => ItemRowStore;
  };
};

const InventoryListStoreSymbol: InjectionKey<InventoryListStore> = Symbol('InventoryListStore');

/**
 * There is no real Application behind an inventory row, so `appConfigOptions`
 * (viewPermission, editPermission, canCreate, sheetConfig, etc.) is never read by the
 * store chain - only `document` is actually consumed. Cast rather than fully satisfying
 * `DocumentSheetConfiguration`, since nothing downstream reads it.
 */
const buildRowContext = <TDocument extends PHYSICAL_ITEMS>(item: TDocument): VueApplicationContext<TDocument> => ({
  document: item,
  appConfigOptions: { document: item } as VueApplicationConfiguration<TDocument>,
  close: async () => {},
});

/**
 * Row-scoped equivalent of `resolveEffectRowComponent` - resolves a per-item-type store
 * instead of a component. Never registers globally (`game.dnd35e.stores`); row stores are
 * owned/cached by the parent actor store (see `ActorSheetStore.getOrCreateItemRowStore`),
 * never shared with a standalone item sheet's own store instance.
 *
 * `renderModeStore` must be the PARENT store's own instance (e.g. `ActorSheetStore`'s
 * `_storeUtils.renderModeStore`), not resolved via ambient `inject()` here - this function
 * isn't guaranteed to run synchronously inside a component that's a Vue-tree descendant of
 * whichever Application provided it (e.g. eager/prefetched row creation).
 */
const createItemRowStore = (item: PHYSICAL_ITEMS, renderModeStore: RenderModeStore): ItemRowStore => {
  switch (item.type) {
    case weaponItemType:
      return useWeaponStore(buildRowContext(item as Weapon), { registerGlobally: false, renderModeStore });
    case containerItemType:
      return useContainerStore(buildRowContext(item as Container), { registerGlobally: false, renderModeStore });
    case ammoItemType:
      return useAmmoStore(buildRowContext(item as Ammo), { registerGlobally: false, renderModeStore });
    default:
      throw new Error(`No item row store registered for item type "${(item as PHYSICAL_ITEMS).type}".`);
  }
};

function createItemRowStoreCache(renderModeStore: RenderModeStore) {
  const cache = new Map<string, ItemRowStore>();
  const getOrCreateItemRowStore = (item: PHYSICAL_ITEMS): ItemRowStore => {
    const existing = cache.get(item.uuid);
    if (existing) return existing;
    const rowStore = createItemRowStore(item, renderModeStore);
    cache.set(item.uuid, rowStore);
    return rowStore;
  };
  const refreshItemRowStores = async (items: PHYSICAL_ITEMS[]): Promise<void> => {
    const currentItems = new Map<string, PHYSICAL_ITEMS>(items.map(item => [item.uuid, item]));
    const refreshes: Promise<void>[] = [];
    for (const [uuid, rowStore] of cache) {
      const item = currentItems.get(uuid);
      if (!item) {
        cache.delete(uuid);
        continue;
      }
      // Each cached store was created for this item's concrete document type.
      const refresh = rowStore._storeUtils.refreshDocument as (doc: PHYSICAL_ITEMS) => Promise<void>;
      refreshes.push(refresh(item));
    }
    await Promise.all(refreshes);
  };
  return { getOrCreateItemRowStore, refreshItemRowStores };
}

export { createItemRowStore, createItemRowStoreCache, InventoryListStoreSymbol };
export type { InventoryListStore, ItemRowStore };
