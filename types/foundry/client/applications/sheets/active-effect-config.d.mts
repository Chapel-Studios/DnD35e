import ActiveEffect from '@client/documents/active-effect.mjs';
import { Combat, Combatant } from '@client/documents/_module.mjs';
import { DataSchema } from '@common/abstract/_types.mjs';
import { EffectChangeData, EffectStartData } from '@common/documents/active-effect.mjs';
import DocumentSheetV2, { DocumentSheetConfiguration, DocumentSheetRenderOptions } from '../api/document-sheet.mjs';
import HandlebarsApplicationMixin, { HandlebarsTemplatePart } from '../api/handlebars-application.mts';
import FormDataExtended from '../ux/form-data-extended.mjs';
import { ApplicationFormConfiguration, ApplicationTabsConfiguration } from '../_types.mjs';

interface ActiveEffectConfigRenderChangeContext {
  /** A copy of the change from the Effect's source array */
  change: EffectChangeData;
  /** The change object's index in the array */
  index: number;
  /** The defined fields of the change data */
  fields: DataSchema;
  /** The change type's default priority */
  defaultPriority: number;
  /** All change types and their localized labels */
  changeTypes: Record<string, string>;
}

/**
 * The Application responsible for configuring a single ActiveEffect document within a parent Actor or Item.
 */
declare class ActiveEffectConfig<
  TDocument extends ActiveEffect = ActiveEffect,
  TConfig extends DocumentSheetConfiguration<TDocument> = DocumentSheetConfiguration<TDocument>,
  TRenderOptions extends DocumentSheetRenderOptions = DocumentSheetRenderOptions,
> extends HandlebarsApplicationMixin(DocumentSheetV2)<TConfig, TRenderOptions> {
  static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration>;

  static override PARTS: Record<string, HandlebarsTemplatePart>;

  static override TABS: Record<string, ApplicationTabsConfiguration>;

  /**
   * Prepare render context for a single change object.
   * @param context Data for rendering the change row
   * @returns The rendered HTML string for the change row
   */
  protected _renderChange(context: ActiveEffectConfigRenderChangeContext): Promise<string>;

  /**
   * Prepare display context for {@link EffectStartData}.
   */
  protected _prepareStartContext(): Promise<(EffectStartData & {
    time: string;
    combat: Combat | null;
    combatant: Combatant | null;
    combatantName: string;
    combatantInitiative: number | string;
  }) | null>;

  protected override _processFormData(
    event: Event | null,
    form: HTMLFormElement,
    formData: FormDataExtended,
  ): Record<string, unknown>;

  /**
   * Process submission data for a single change object.
   * @param change The submitted change object with the value deserialized
   * @param index The object's index in the submitted array
   */
  protected _processChangeSubmission(change: EffectChangeData, index: number): void;

  protected override _onChangeForm(formConfig: ApplicationFormConfiguration, event: Event): void;
}

export default ActiveEffectConfig;

export {
  ActiveEffectConfigRenderChangeContext,
};
