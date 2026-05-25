import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import type { DocumentSheetConfiguration, DocumentSheetRenderOptions } from '@client/applications/api/document-sheet.mjs';
import type { ActiveEffectDnd35e } from '@documents/activeEffects/index.mjs';
import type { DocumentSheetStore } from '@documents/document/index.mjs';
import type { ViewMode } from '@helpers/formulae/types.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';

type SheetDocumentType = ItemDnd35e | ActiveEffectDnd35e | ActorDnd35e;

interface VueApplicationConfiguration<TDocument extends SheetDocumentType> extends
  DocumentSheetConfiguration<TDocument>
{
  document: TDocument;
  isEditable?: boolean;
}

interface VueRenderOptions extends DocumentSheetRenderOptions {
  isEditable?: boolean;
}

interface SheetState {
  /** Current sheet mode state. */
  viewMode: ViewMode;
}

interface VueApplicationContext<TDocument extends SheetDocumentType> {
  document: TDocument;
  appConfigOptions: VueApplicationConfiguration<TDocument>;
  renderOptions?: VueRenderOptions;
  close: () => Promise<void>;
}

interface VueApplicationContextTransfer<TDocument extends SheetDocumentType> extends VueApplicationContext<TDocument> {
  store?: DocumentSheetStore<TDocument> | undefined;
}

export type {
  SheetDocumentType,
  SheetState,
  VueApplicationConfiguration,
  VueApplicationContext,
  VueApplicationContextTransfer,
  VueRenderOptions,
};
