import Actor from '@client/documents/actor.mjs';
import DocumentSheetV2, { DocumentSheetConfiguration, DocumentSheetRenderOptions } from '../api/document-sheet.mjs';

/** A base class for providing Actor Sheet behavior using ApplicationV2. */
export default abstract class ActorSheetV2<
    TDocument extends Actor,
    TConfig extends DocumentSheetConfiguration<TDocument>,
    TRenderOptions extends DocumentSheetRenderOptions = DocumentSheetRenderOptions
> extends DocumentSheetV2<TConfig, TRenderOptions> {
  static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration>;

  /** The Actor document managed by this sheet. */
  get actor(): TDocument;

  protected _onDrop(event: DragEvent): Promise<void>;
}
