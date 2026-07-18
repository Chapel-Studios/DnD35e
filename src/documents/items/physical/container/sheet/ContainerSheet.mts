import { syncContainmentAe } from '@effects/containment/index.mjs';
import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import { syncContainmentAe } from '@effects/containment/index.mjs';
import { ItemSheetDnd35e } from '@items/baseItem/sheet/ItemSheetDnd35e.mjs';
import { containerItemType, PHYSICAL_ITEM_TYPES,type PHYSICAL_ITEMS,type PhysicalItemType } from '@items/itemTypes.mjs';
import type { Container } from '@items/physical/container/index.mjs';
import type { PhysicalItemLike, PhysicalItemSheetRenderContext } from '@items/physical/physicalItem/index.mjs';

import ContainerSheetVue from './ContainerSheet.vue';

type ContainerSheetConfig = DocumentSheetConfiguration<Container>;
type ContainerSheetRenderContext = PhysicalItemSheetRenderContext & {
  document: Container;
};

// dnd35e type-fix: do NOT parameterize `ItemSheetDnd35e` with `Container`, and do NOT
// override the `document` getter to return `Container`. Either forces TypeScript to expand
// the full deep mixin chain (Container → PhysicalItem → IdentifiableItemBase → DocumentMixin…)
// for a covariant assignability check against `ItemDnd35e`, tripping TS2589 ("excessively
// deep"). Consumers cast `this.document as unknown as Container` at the two call sites below.
class ContainerSheet extends ItemSheetDnd35e {

  get vueComponent () {
    return ContainerSheetVue;
  }

  /**
   * Handle items dropped onto the container sheet.
   * Physical items are stowed into this container; all others fall through to
   * the default handler.
   */
  override async _onDrop (event: DragEvent): Promise<void> {
    // run super if dropped doc wasn't a physical item
    const data = foundry.applications.ux.TextEditor.getDragEventData(event) as Record<string, unknown>;
    if (data?.type !== 'Item') return super._onDrop(event);

    const dropped = await Item.implementation.fromDropData(data);
    if (!(dropped instanceof Item) || !PHYSICAL_ITEM_TYPES.has(dropped.type as PhysicalItemType)) {
      return super._onDrop(event);
    }

    const container = this.document as unknown as Container;
    if (dropped.uuid === container.uuid) return; // no self-nesting

    event.preventDefault();

    const item = dropped as PHYSICAL_ITEMS;
    await this.#onItemDrop(item);
  }

  async #onItemDrop (item: PHYSICAL_ITEMS): Promise<void> {
    const container = this.document as unknown as Container;
    const actor = container.actor;

    const createItemCopy = (item: PhysicalItemLike) => {
      const copiedItem = item.toObject() as Record<string, unknown>;
      delete (copiedItem as { _id?: string })._id;
      copiedItem.system = {
        ...((copiedItem.system as Record<string, unknown>) ?? {}),
        // containerUuid: container.uuid,
        isCarried: container.system.isCarried,
      };
      return copiedItem;
    };

    if (actor && item.parent?.uuid === actor.uuid) {
      // Item already belongs to the same actor — link it.
      if (container.system.isCarried !== item.system.isCarried) {
        await item.update({ 'system.isCarried': container.system.isCarried });
      }
      await syncContainmentAe(item, container);
    } else if (actor) {
      // Item from elsewhere — copy onto the actor with containerUuid set.
      const newItems = [
        createItemCopy(item),
      ];
      if (item.type === containerItemType) {
        // If the dropped item is a container, also copy its contents onto the actor.
        const contents = await item.getContents();
        newItems.push(...contents.map(createItemCopy));
      }
      const newItem = await actor.createEmbeddedDocuments('Item', newItems);
      await syncContainmentAe(newItem[0] as PHYSICAL_ITEMS, container);
    } else {
      // Standalone container (world item) — just point the item at it.
      await syncContainmentAe(item, container);
    }
  }
}

export { ContainerSheet };
export type {
  ContainerSheetConfig,
  ContainerSheetRenderContext,
};
