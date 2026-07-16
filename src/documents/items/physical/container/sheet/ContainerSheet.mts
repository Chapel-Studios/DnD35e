import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import { ItemSheetDnd35e } from '@items/baseItem/sheet/ItemSheetDnd35e.mjs';
import { PHYSICAL_ITEM_TYPES,type PhysicalItemType } from '@items/itemTypes.mjs';
import type { Container } from '@items/physical/container/index.mjs';
import type { PhysicalItemSheetRenderContext } from '@items/physical/physicalItem/index.mjs';

import ContainerSheetVue from './ContainerSheet.vue';

type ContainerSheetConfig = DocumentSheetConfiguration<Container>;
type ContainerSheetRenderContext = PhysicalItemSheetRenderContext & {
  document: Container;
};

class ContainerSheet extends ItemSheetDnd35e<Container> {
  get vueComponent () {
    return ContainerSheetVue;
  }

  /**
   * Handle items dropped onto the container sheet.
   * Physical items are stowed into this container; all others fall through to
   * the default handler.
   */
  override async _onDrop (event: DragEvent): Promise<void> {
    const data = foundry.applications.ux.TextEditor.getDragEventData(event) as Record<string, unknown>;
    if (data?.type !== 'Item') return super._onDrop(event);

    const dropped = await Item.implementation.fromDropData(data);
    if (!(dropped instanceof Item) || !PHYSICAL_ITEM_TYPES.has(dropped.type as PhysicalItemType)) {
      return super._onDrop(event);
    }

    const container = this.document;
    if (dropped.uuid === container.uuid) return; // no self-nesting

    event.preventDefault();

    const actor = container.actor;

    if (actor && dropped.parent?.uuid === actor.uuid) {
      // Item already belongs to the same actor — link it.
      await dropped.update({ 'system.containerUuid': container.uuid, 'system.isCarried': true });
    } else if (actor) {
      // Item from elsewhere — copy onto the actor with containerUuid set.
      const source = dropped.toObject() as Record<string, unknown>;
      delete (source as { _id?: string })._id;
      source.system = {
        ...((source.system as Record<string, unknown>) ?? {}),
        containerUuid: container.uuid,
        isCarried: true,
      };
      await actor.createEmbeddedDocuments('Item', [source]);
    } else {
      // Standalone container (world item) — just point the item at it.
      await dropped.update({ 'system.containerUuid': container.uuid });
    }
  }
}

export { ContainerSheet };
export type {
  ContainerSheetConfig,
  ContainerSheetRenderContext,
};
