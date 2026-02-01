import type { DocumentSheetRenderContext } from '@client/applications/api/document-sheet.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/itemTypes.mjs';
import { VueApplication, VueApplicationConfiguration } from '@vc/VueApplication.mjs';
import type { ApplicationRenderOptions } from '@client/applications/_module.mjs';

export interface BaseItemSheetRenderContext extends DocumentSheetRenderContext {
  document: ItemDnd35e<ItemType>;
  renderOptions: fa.ApplicationRenderOptions;
};

/**
 * Base class for all DnD35e item sheets using Vue.
 *
 * TDocument is fully typed based on the ItemType union.
 * Example: ItemSheetDnd35e<ItemDnd35e<"material">>
 */
abstract class ItemSheetDnd35e<
  TDocument extends ItemDnd35e<ItemType> = ItemDnd35e<ItemType>
> extends VueApplication<TDocument> {
  /** Vue component class must be provided by subclasses */
  // static override vueComponent: any;

  /**
   * Default options for all DnD35e item sheets.
   * These are merged with VueApplication.defaultOptions.
   */
  static override get DEFAULT_OPTIONS(): DeepPartial<VueApplicationConfiguration<ItemDnd35e>> {
    return {
      classes: ["dnd35e", "item-sheet"],
      id: "dnd35e-item-sheet",
      position: {
        width: 560,
        height: 650
      }
    };
  }

  /**
   * Title shown in the window header.
   * Uses the document's displayName (AppV2-safe).
   */
  override get title(): string {
    return this.document.displayName;
  }

  /**
   * Provide the data that Vue receives on first mount.
   * VueApplication will merge this into the reactive context.
   */
  protected override async _prepareContext(
    options: ApplicationRenderOptions
  ): Promise<object> {

    return {
      editable: this.isEditable,
      renderOptions: options
    };
  }
}

export {
  ItemSheetDnd35e,
};
