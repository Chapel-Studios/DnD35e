import { DocumentSheetConfiguration, DocumentSheetRenderOptions } from '@client/applications/api/document-sheet.mjs';
import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { DnD35eActiveEffect } from '@entities/activeEffects/index.mjs';
import type { EditorViewMode } from '@helpers/formulae/types.mjs';
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
  /** Whether the sheet is in edit mode vs play mode */
  editMode: boolean;
  /** Which view is shown for identifiable items */
  editorViewMode: EditorViewMode;
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
