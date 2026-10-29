/**
 * FormulaField — EmbeddedDataField subclass wrapping FormulaData.
 *
 * Stores formula text + resolved value + context bindings + permission overrides. AE
 * `add`/`subtract` changes target the `.formula` leaf directly (see `RollFormulaStringField`),
 * so they survive core's write-back; FormulaField itself only handles the Secret-AE mask
 * `override` path (`_applyChangeOverride`).
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
import type { FormulaContextDeclaration, FormulaExpectedType, FormulaFieldMeta } from './types.mjs';

const { EmbeddedDataField } = foundry.data.fields;

type BaseFormulaFieldOptions = {
  /** Expected result type when resolving the formula. Default: 'string'. */
  expectedType?: FormulaExpectedType;
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
  /**
   * Convenience prefill for just the formula text, sparing callers from constructing a
   * full `FormulaDataSource` object. Ignored if `initial` is also supplied. Resolves to
   * `{ formula: initialFormula, resolvedValue: null, expectedType }`.
   */
  initialFormula?: string;
}

type NullableFieldOptions = {
  /** Allow null value (no formula set). Default: true. */
  nullable?: true;
  /** Initial value. Default: null. */
  initial?: FormulaDataSource | (() => FormulaDataSource) | null;
};

type NonNullableFieldOptions = {
  /** Allow null value (no formula set). Default: true. */
  nullable?: false;
  /** Initial value. Default: null. */
  initial?: FormulaDataSource | (() => FormulaDataSource);
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
      initialFormula,
      ...fieldOptions
    } = options;

    if (initialFormula !== undefined && fieldOptions.initial === undefined) {
      fieldOptions.initial = () => ({
        formula: initialFormula,
        resolvedValue: null,
        expectedType: expectedType ?? 'string',
      });
    }

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
  // Expected type
  // ---------------------------------------------------------------------------

  /** Expected result type when resolving the formula (used for type-mismatch validation). */
  get expectedType (): FormulaExpectedType {
    return (this.options as Record<string, unknown>).expectedType as FormulaExpectedType ?? 'string';
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
   * AE Override (Secret-AE mask path): replaces the authored `formula` text with the masked
   * value, clearing the resolved cache so it re-resolves. This is the only AE-change handler
   * FormulaField needs — `add`/`subtract` target the `.formula` leaf directly (see
   * `RollFormulaStringField`), never the parent `FormulaField`.
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
}

export { FormulaField };
export type { FormulaFieldOptions };
