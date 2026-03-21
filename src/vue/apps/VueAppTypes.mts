import { DocumentSheetConfiguration, DocumentSheetRenderOptions } from '@client/applications/api/document-sheet.mjs';
import { DocumentSheetStore } from '@ec/CoreMixin/sheet/index.mjs';
import { DnD35eActiveEffect } from '@entities/activeEffects/index.mjs';
import { ItemDnd35e } from '@items/baseItem/index.mjs';

interface VueApplicationConfiguration<TDocument extends ItemDnd35e | DnD35eActiveEffect> extends
  DocumentSheetConfiguration<TDocument>
{
  document: TDocument;
  isEditable?: boolean;
}

interface VueRenderOptions extends DocumentSheetRenderOptions {
  isEditable?: boolean;
}

/**
 * Shared reactive state for sheet controls that can be modified from
 * both Foundry header controls and Vue components.
 */
type EditorViewMode = 'identified' | 'unidentified';

interface SheetState {
  /** Whether the sheet is in edit mode vs play mode */
  editMode: boolean;
  /** Which view is shown for identifiable items */
  editorViewMode: EditorViewMode;
}

interface VueApplicationContext<TDocument extends ItemDnd35e | DnD35eActiveEffect> {
  document: TDocument;
  appConfigOptions: VueApplicationConfiguration<TDocument>;
  isEditable: boolean;
  renderOptions?: VueRenderOptions;
  close: () => Promise<void>;
  /** Shared reactive state for header controls */
  sheetState: SheetState;
}

interface VueApplicationContextTransfer<TDocument extends ItemDnd35e | DnD35eActiveEffect> extends VueApplicationContext<TDocument> {
  store?: DocumentSheetStore<TDocument> | undefined;
}

export type {
  EditorViewMode,
  SheetState,
  VueApplicationConfiguration,
  VueApplicationContext,
  VueApplicationContextTransfer,
  VueRenderOptions,
};
