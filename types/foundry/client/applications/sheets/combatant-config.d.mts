import Combatant from '@client/documents/combatant.mjs';
import {
  DocumentSheetConfiguration,
  DocumentSheetRenderContext,
  DocumentSheetV2,
  HandlebarsApplicationMixin,
  HandlebarsRenderOptions,
  HandlebarsTemplatePart,
} from '../api/_module.mjs';

/**
 * The Combatant configuration application.
 */
declare class CombatantConfig<
  TDocument extends Combatant = Combatant,
  TConfig extends DocumentSheetConfiguration<TDocument> = DocumentSheetConfiguration<TDocument>,
  TRenderOptions extends HandlebarsRenderOptions = HandlebarsRenderOptions,
> extends HandlebarsApplicationMixin(DocumentSheetV2)<TConfig, TRenderOptions> {
  static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration>;

  static override PARTS: Record<string, HandlebarsTemplatePart>;

  override get title(): string;

  protected override _prepareContext(options: HandlebarsRenderOptions): Promise<Partial<DocumentSheetRenderContext>>;
}

export default CombatantConfig;
