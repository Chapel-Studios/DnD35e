import Item from "@client/documents/item.mjs";
import DocumentSheetV2, { DocumentSheetConfiguration, DocumentSheetRenderOptions } from "../api/document-sheet.mjs";
import HandlebarsApplicationMixin from "../api/handlebars-application.mts";

/** A base class for providing Item Sheet behavior using ApplicationV2. */
export default abstract class ItemSheetV2<
    TDocument extends Item,
    TConfig extends DocumentSheetConfiguration<TDocument>,
    TRenderOptions extends DocumentSheetRenderOptions = DocumentSheetRenderOptions
> extends DocumentSheetV2<TConfig, TRenderOptions> {
    static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration>;

    /** The Item document managed by this sheet. */
    get item(): TDocument;

    // get document(): TDocument;

    /** The Actor instance which owns this Item, if any. */
    get actor(): TDocument["actor"];
}
