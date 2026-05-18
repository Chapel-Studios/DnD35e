/**
 * FormulaField — EmbeddedDataField subclass wrapping FormulaData.
 *
 * Stores formula text + resolved value + unidentified variant + context bindings
 * + permission overrides. AE override replaces the formula text and clears the cache.
 *
 * @example
 * ```ts
 * schema.nameFormula = new FormulaField({ expectedType: 'string' });
 * ```
 *
 * @module
 */

import type { EffectChangeData } from '@common/documents/active-effect.mjs';
import type { FieldEditability, FieldVisibility } from '@vc/fields/formGroups/fieldPermissions.mjs';

import type { FormulaDataSource } from './FormulaData.mjs';
import { FormulaData } from './FormulaData.mjs';
import type { FormulaContextDeclaration, FormulaFieldMeta } from './types.mjs';

const { EmbeddedDataField } = foundry.data.fields;

type BaseFormulaFieldOptions = {
  /** Expected result type when resolving the formula. Default: 'string'. */
  expectedType?: 'string' | 'number';
  /** Default visibility when no GM override is saved. Default: 'everyone'. */
  defaultVisibility?: FieldVisibility;
  /** Default editability when no GM override is saved. Default: 'normal'. */
  defaultEditability?: FieldEditability;
  /** Whether the GM can change visibility on this field. Default: true. */
  canVisibilityBeChanged?: boolean;
  /** Whether the GM can change editability on this field. Default: true. */
  canEditabilityBeChanged?: boolean;
  /** Familiar metadata for the schema walker. */
  familiar?: FormulaFieldMeta;
  /** Formula context declarations — which additional contexts this field can reference. */
  contexts?: FormulaContextDeclaration[];
  /**
   * Top-level aspect keys that this formula must NOT reference.
   * Used to prevent circular references (e.g. nameFormula cannot reference 'name').
   */
  excludedFields?: string[];
  /** Required field. Default: false. */
  required?: boolean;
}

type NullableFieldOptions = {
  /** Allow null value (no formula set). Default: true. */
  nullable?: true;
  /** Initial value. Default: null. */
  initial?: FormulaDataSource | null;
};

type NonNullableFieldOptions = {
  /** Allow null value (no formula set). Default: true. */
  nullable?: false;
  /** Initial value. Default: null. */
  initial?: FormulaDataSource;
};

type FormulaFieldOptions = BaseFormulaFieldOptions
  & (NullableFieldOptions | NonNullableFieldOptions);

/**
 * EmbeddedDataField for formula storage + resolution.
 * Wraps {@link FormulaData} DataModel.
 */
class FormulaField extends EmbeddedDataField<FormulaData, false, true, true> {
  static isFamiliarLeaf = true;

  constructor(options: FormulaFieldOptions = {
    canEditabilityBeChanged: true,
    canVisibilityBeChanged: true,
    defaultEditability: 'normal',
    defaultVisibility: 'everyone',
    expectedType: 'number',
    familiar: {},
    nullable: true,
    required: false,
    initial: null,
  }) {
    const {
      expectedType,
      defaultVisibility,
      defaultEditability,
      canVisibilityBeChanged,
      canEditabilityBeChanged,
      familiar,
      contexts,
      excludedFields,
      ...fieldOptions
    } = options;

    super(FormulaData, {
      ...fieldOptions,
    } as any);

    // Store metadata in options bag (Foundry preserves unknown keys)
    const opts = this.options as Record<string, unknown>;
    if (defaultVisibility) opts.defaultVisibility = defaultVisibility;
    if (defaultEditability) opts.defaultEditability = defaultEditability;
    if (canVisibilityBeChanged !== undefined) opts.canVisibilityBeChanged = canVisibilityBeChanged;
    if (canEditabilityBeChanged !== undefined) opts.canEditabilityBeChanged = canEditabilityBeChanged;
    if (expectedType) {
      opts.expectedType = expectedType;
    }
    if (familiar) {
      opts.familiar = familiar;
    }
    if (contexts) {
      opts.contexts = contexts;
    }
    if (excludedFields) {
      opts.excludedFields = excludedFields;
    }
  }

  // ---------------------------------------------------------------------------
  // Formula context declarations
  // ---------------------------------------------------------------------------

  /** Formula context declarations for this field. */
  get formulaContexts (): FormulaContextDeclaration[] {
    return (this.options as Record<string, unknown>).contexts as FormulaContextDeclaration[] ?? [];
  }

  set formulaContexts (value: FormulaContextDeclaration[]) {
    (this.options as Record<string, unknown>).contexts = value;
  }

  // ---------------------------------------------------------------------------
  // Excluded fields
  // ---------------------------------------------------------------------------

  /** Top-level aspect keys this formula must not reference (e.g. ['name']). */
  get excludedFields (): string[] {
    return (this.options as Record<string, unknown>).excludedFields as string[] ?? [];
  }

  set excludedFields (value: string[]) {
    (this.options as Record<string, unknown>).excludedFields = value;
  }

  // ---------------------------------------------------------------------------
  // Active Effect change routing
  // ---------------------------------------------------------------------------

  /**
   * Cast the raw AE change value to a formula string.
   */
  override _castChangeDelta(raw: unknown): string {
    return String(raw ?? '');
  }

  /**
   * AE Override: replace the formula text and clear the resolved cache.
   */
  override _applyChangeOverride(
    current: unknown,
    delta: unknown,
    _model: foundry.abstract.DataModel,
    _change: EffectChangeData
  ): unknown {
    const data = (current ?? {}) as Record<string, unknown>;
    return {
      ...data,
      formula: delta,
      resolvedValue: null,
    };
  }

  /**
   * AE Add: append to formula text (string concatenation).
   */
  override _applyChangeAdd(
    current: unknown,
    delta: unknown,
    _model: foundry.abstract.DataModel,
    _change: EffectChangeData
  ): unknown {
    const data = (current ?? {}) as Record<string, unknown>;
    const existingFormula = (data.formula as string) ?? '';
    return {
      ...data,
      formula: existingFormula + String(delta),
      resolvedValue: null,
    };
  }

  /**
   * AE Subtract: prepend to formula text.
   */
  override _applyChangeSubtract(
    current: unknown,
    delta: unknown,
    _model: foundry.abstract.DataModel,
    _change: EffectChangeData
  ): unknown {
    const data = (current ?? {}) as Record<string, unknown>;
    const existingFormula = (data.formula as string) ?? '';
    return {
      ...data,
      formula: String(delta) + existingFormula,
      resolvedValue: null,
    };
  }

  /**
   * AE Multiply: not applicable to formula fields.
   */
  override _applyChangeMultiply(
    current: unknown,
    _delta: unknown,
    _model: foundry.abstract.DataModel,
    _change: EffectChangeData
  ): unknown {
    console.warn('FormulaField does not support the Multiply change type.');
    return current;
  }

  /**
   * AE Upgrade: not applicable to formula fields.
   */
  override _applyChangeUpgrade(
    current: unknown,
    _delta: unknown,
    _model: foundry.abstract.DataModel,
    _change: EffectChangeData
  ): unknown {
    console.warn('FormulaField does not support the Upgrade change type.');
    return current;
  }

  /**
   * AE Downgrade: not applicable to formula fields.
   */
  override _applyChangeDowngrade(
    current: unknown,
    _delta: unknown,
    _model: foundry.abstract.DataModel,
    _change: EffectChangeData
  ): unknown {
    console.warn('FormulaField does not support the Downgrade change type.');
    return current;
  }
}

export { FormulaField };
export type { FormulaFieldOptions };
