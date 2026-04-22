import type { DocumentSheetConfiguration, DocumentSheetRenderOptions } from '@client/applications/api/document-sheet.mjs';
import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { DnD35eActiveEffect } from '@entities/activeEffects/index.mjs';
import type { ViewMode } from '@helpers/formulae/types.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';

interface VueApplicationConfiguration<TDocument extends ItemDnd35e | DnD35eActiveEffect> extends
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

interface VueApplicationContext<TDocument extends ItemDnd35e | DnD35eActiveEffect> {
  document: TDocument;
  appConfigOptions: VueApplicationConfiguration<TDocument>;
  renderOptions?: VueRenderOptions;
  close: () => Promise<void>;
}

interface VueApplicationContextTransfer<TDocument extends ItemDnd35e | DnD35eActiveEffect> extends VueApplicationContext<TDocument> {
  store?: DocumentSheetStore<TDocument> | undefined;
}

export type {
  SheetState,
  VueApplicationConfiguration,
  VueApplicationContext,
  VueApplicationContextTransfer,
  VueRenderOptions,
};
