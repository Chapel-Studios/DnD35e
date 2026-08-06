import type { RenderModeStore } from '@documents/document/sheet/stores/RenderModeStore.mjs';
import type { PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
import { containerItemType, weaponItemType } from '@items/itemTypes.mjs';
import type { Container } from '@items/physical/container/Container.mjs';
import type { ContainerStore } from '@items/physical/container/sheet/ContainerStore.mjs';
import { useContainerStore } from '@items/physical/container/sheet/ContainerStore.mjs';
import type { WeaponStore } from '@items/physical/weapon/sheet/WeaponStore.mjs';
import { useWeaponStore } from '@items/physical/weapon/sheet/WeaponStore.mjs';
import type { Weapon } from '@items/physical/weapon/Weapon.mjs';
import type { VueApplicationConfiguration, VueApplicationContext } from '@vueApps/VueAppTypes.mjs';

type ItemRowStore = WeaponStore | ContainerStore;

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
    default:
      throw new Error(`No item row store registered for item type "${(item as PHYSICAL_ITEMS).type}".`);
  }
};

export { createItemRowStore };
export type { ItemRowStore };
