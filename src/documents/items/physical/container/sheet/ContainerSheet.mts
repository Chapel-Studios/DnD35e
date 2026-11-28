import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import { ItemSheetDnd35e } from '@items/baseItem/sheet/ItemSheetDnd35e.mjs';
import { PHYSICAL_ITEM_TYPES,type PHYSICAL_ITEMS,type PhysicalItemType } from '@items/itemTypes.mjs';
import type { Container } from '@items/physical/container/index.mjs';
import { addItemToContainer } from '@items/physical/container/logic/addItemToContainer.mjs';
import type { PhysicalItemSheetRenderContext } from '@items/physical/physicalItem/index.mjs';

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

    await addItemToContainer(dropped as PHYSICAL_ITEMS, container);
  }
}

export { ContainerSheet };
export type {
  ContainerSheetConfig,
  ContainerSheetRenderContext,
};
