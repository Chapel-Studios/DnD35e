/**
 * Dnd35eField — Generic wrapper that wraps ANY Foundry DataField with a compound shape:
 *   { value, unidentifiedValue }
 *
 * Field-level settings (visibility, editability defaults and whether they can be changed)
 * are stored in the field's options at schema definition time. Runtime overrides set by
 * GMs are stored in document flags (`flags.dnd35e.fieldOverrides`), not in the schema.
 *
 * @example
 * ```ts
 * schema.hardness = new Dnd35eField(NumberField, { initial: 0 }, {
 *   familiar: { formulaVisible: true, display: 'Hardness' },
 * });
 * schema.size = new Dnd35eField(StringField, { initial: 'medium', choices: SIZES });
 * schema.isCarried = new Dnd35eField(BooleanField, { initial: true });
 * ```
 *
 * @module
 */

import type { EffectChangeData } from '@common/documents/active-effect.mjs';
import type { EditorViewMode, FormulaFieldMeta } from '@helpers/formulae/types.mjs';
import { UNIDENTIFIED } from '@helpers/formulae/types.mjs';
import type { FieldEditability, FieldVisibility } from '@vc/Fields/FormGroups/fieldPermissions.mjs';

const { SchemaField } = foundry.data.fields;

interface Dnd35eFieldOptions {
  familiar?: FormulaFieldMeta;
  /** Whether this field supports identified/unidentified variants. Default: true. */
  identifiable?: boolean;
  /** Default visibility when no GM override is saved. Default: 'everyone'. */
  defaultVisibility?: FieldVisibility;
  /** Default editability when no GM override is saved. Default: 'normal'. */
  defaultEditability?: FieldEditability;
  /** Whether the GM can change visibility on this field. Default: true. */
  canVisibilityBeChanged?: boolean;
  /** Whether the GM can change editability on this field. Default: true. */
  canEditabilityBeChanged?: boolean;
  label: string;
  hint: string;
}

/**
 * Data shape stored in the database for a Dnd35eField instance.
 */
interface Dnd35eFieldData<T = unknown> {
  value: T;
  unidentifiedValue: T | null;
}

type FieldMethods =
  | '_applyChangeAdd'
  | '_applyChangeMultiply'
  | '_applyChangeUpgrade'
  | '_applyChangeDowngrade'
  | '_applyChangeSubtract';


/**
 * Generic wrapper that takes any Foundry DataField class and wraps it
 * in a SchemaField with `{ value, unidentifiedValue }`.
 *
 * AE changes are routed to the `.value` sub-field, delegating to the
 * inner field's own AE logic.
 */
class Dnd35eField<
  TSource extends JSONValue = JSONValue,
  TDataField extends foundry.data.fields.DataField<TSource> = foundry.data.fields.DataField<TSource>
> extends SchemaField {
  constructor(
    InnerFieldClass: ConstructorOf<TDataField>,
    innerOptions: Record<string, unknown> = {},
    wrapperOptions: Dnd35eFieldOptions = {
      label: '',
      hint: '',
    }
  ) {
    innerOptions.label = innerOptions.label ?? wrapperOptions.label;
    innerOptions.hint = innerOptions.hint ?? wrapperOptions.hint;
    const {
      familiar,
      identifiable = true,
      defaultVisibility,
      defaultEditability,
      canVisibilityBeChanged,
      canEditabilityBeChanged,
      ...schemaOptions
    } = wrapperOptions;

    const fields: Record<string, TDataField> = {
      value: new InnerFieldClass(innerOptions),
    };

    if (identifiable) {
      fields.unidentifiedValue = new InnerFieldClass({
        ...innerOptions,
        nullable: true,
        initial: null,
        required: false,
      });
    }

    super(fields, schemaOptions);

    // Foundry preserves unknown keys in this.options
    const opts = this.options as Record<string, unknown>;
    opts.identifiable = identifiable;
    if (defaultVisibility) opts.defaultVisibility = defaultVisibility;
    if (defaultEditability) opts.defaultEditability = defaultEditability;
    if (canVisibilityBeChanged !== undefined) opts.canVisibilityBeChanged = canVisibilityBeChanged;
    if (canEditabilityBeChanged !== undefined) opts.canEditabilityBeChanged = canEditabilityBeChanged;
    if (familiar) {
      opts.familiar = familiar;
    }
  }


  // ---------------------------------------------------------------------------
  // Static helpers
  // ---------------------------------------------------------------------------

  /**
   * Get the effective value for a given view mode.
   * Returns unidentifiedValue when viewing unidentified (if set), otherwise value.
   */
  static getEffective<T>(
    data: Dnd35eFieldData<T>,
    viewMode: EditorViewMode
  ): T {
    if (viewMode === UNIDENTIFIED && data.unidentifiedValue != null) {
      return data.unidentifiedValue;
    }
    return data.value;
  }

  getViewModeAwareValue(viewMode: EditorViewMode): TDataField {
    if (viewMode === UNIDENTIFIED && this.fields.unidentifiedValue != null) {
      return (this.fields.unidentifiedValue ?? this.fields.value) as TDataField;
    }
    return this.fields.value as TDataField;
  }

  // ---------------------------------------------------------------------------
  // Active Effect change routing — all changes target .value
  // ---------------------------------------------------------------------------

  /**
   * Delegate to the inner value field's protected AE method by name.
   * Cast through `any` because TypeScript disallows calling protected methods
   * on a different instance, even from a subclass.
   * @internal
   */
  private _delegateToValueField(
    method: FieldMethods,
    value: unknown,
    delta: unknown,
    model: foundry.abstract.DataModel,
    change: EffectChangeData
  ): unknown {
    const field = this.fields.value;
    return field[method]?.(value, delta, model, change);
  }

  override _castChangeDelta(raw: unknown): unknown {
    const field = (this.fields as Record<string, foundry.data.fields.DataField>).value;
    return field._castChangeDelta(raw);
  }

  override _applyChangeAdd(
    current: unknown,
    delta: unknown,
    model: foundry.abstract.DataModel,
    change: EffectChangeData
  ): unknown {
    const data = current as Dnd35eFieldData<TSource>;
    const newValue = this._delegateToValueField('_applyChangeAdd', data.value, delta, model, change);
    return { ...data, value: newValue };
  }

  override _applyChangeMultiply(
    current: unknown,
    delta: unknown,
    model: foundry.abstract.DataModel,
    change: EffectChangeData
  ): unknown {
    const data = current as Dnd35eFieldData<TSource>;
    const newValue = this._delegateToValueField('_applyChangeMultiply', data.value, delta, model, change);
    return { ...data, value: newValue };
  }

  override _applyChangeOverride(
    current: unknown,
    delta: unknown,
    _model: foundry.abstract.DataModel,
    _change: EffectChangeData
  ): unknown {
    const data = current as Dnd35eFieldData<TSource>;
    return { ...data, value: delta };
  }

  override _applyChangeUpgrade(
    current: unknown,
    delta: unknown,
    model: foundry.abstract.DataModel,
    change: EffectChangeData
  ): unknown {
    const data = current as Dnd35eFieldData<TSource>;
    const newValue = this._delegateToValueField('_applyChangeUpgrade', data.value, delta, model, change);
    return { ...data, value: newValue };
  }

  override _applyChangeDowngrade(
    current: unknown,
    delta: unknown,
    model: foundry.abstract.DataModel,
    change: EffectChangeData
  ): unknown {
    const data = current as Dnd35eFieldData<TSource>;
    const newValue = this._delegateToValueField('_applyChangeDowngrade', data.value, delta, model, change);
    return { ...data, value: newValue };
  }

  override _applyChangeSubtract(
    current: unknown,
    delta: unknown,
    model: foundry.abstract.DataModel,
    change: EffectChangeData
  ): unknown {
    const data = current as Dnd35eFieldData<TSource>;
    const newValue = this._delegateToValueField('_applyChangeSubtract', data.value, delta, model, change);
    return { ...data, value: newValue };
  }
}

export { Dnd35eField };
export type { Dnd35eFieldData, Dnd35eFieldOptions };
