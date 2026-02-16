import { DocumentSheetConfiguration, DocumentSheetRenderOptions } from '@client/applications/api/document-sheet.mjs';
import { DnD35eActiveEffect } from '@entities/activeEffects/index.mjs';
import { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';

interface VueApplicationConfiguration<TDocument extends ItemDnd35e | DnD35eActiveEffect> extends
  DocumentSheetConfiguration<TDocument>
{
  document: TDocument;
  isEditable?: boolean;
}

interface VueRenderOptions extends DocumentSheetRenderOptions {
  isEditable?: boolean;
}

interface VueApplicationContext<TDocument extends ItemDnd35e | DnD35eActiveEffect> {
  document: TDocument;
  appConfigOptions: VueApplicationConfiguration<TDocument>;
}

export type {
  VueApplicationConfiguration,
  VueRenderOptions,
  VueApplicationContext,
};
