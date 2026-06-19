import type { MaskedEditStrategy } from '@constants/fields.mjs';
import { MASKED_EDIT_STRATEGY } from '@constants/fields.mjs';
import type { FormulaFieldMeta } from '@helpers/formulae/types.mjs';
import type { FieldEditability, FieldVisibility } from '@vc/fields/formGroups/fieldPermissions.mjs';

const {
  StringField,
  HTMLField,
  BooleanField,
  NumberField,
  ObjectField,
  SchemaField,
} = foundry.data.fields;

// Strings
const requiredStringField = (initialValue?: string) => {
  return new StringField<string, string, true, false, true>({ required: true, nullable: false, initial: initialValue ?? '' });
};
const requiredNullableStringField = (initialValue?: string) => {
  return new StringField<string, string, true, false, true>({ initial: initialValue ?? '', required: true, blank: true });
};

const nullableOptionalStringField = (initialValue?: string) => {
  return new StringField<string, string, false, true, true>({ required: false, blank: true, initial: initialValue ?? undefined });
};

const derivedNullableOptionalStringField = (initialValue?: string | null) => {
  return new StringField<string, string, false, true, true>({ required: false, blank: true, initial: initialValue, persisted: false });
};

const derivedOptionalStringField = (initialValue?: string) => {
  return new StringField<string, string, false, true, true>({ required: false, blank: true, initial: initialValue, persisted: false });
};

const optionalStringField = (initialValue?: string) => {
  return new StringField<string, string, false, false, true>({ required: false, blank: true, initial: initialValue ?? undefined });
};

const requiredTypedStringField = <TChoice extends string> (
  choices: readonly TChoice[] | Set<TChoice>,
  initial: TChoice,
  blank: boolean = false
) => {
  return new StringField<TChoice, TChoice, true, false, true>({
    choices: Array.from(choices),
    initial,
    required: true,
    blank,
  });
};

// HTML
const optionalHtmlField = () =>
  new HTMLField({ required: false, nullable: false, blank: true });

// Bools
const requiredBooleanField = (initialValue?: boolean) => {
  if (initialValue === undefined) {
    initialValue = false;
  }
  return new BooleanField<boolean, boolean, true, false, true>({ required: true, nullable: false, initial: initialValue });
};

// Numbers
const requiredNumberField = (initialValue?: number) => {
  if (initialValue === undefined) {
    initialValue = 0;
  }
  return new NumberField<number, number, true, false, true>({ required: true, nullable: false, initial: initialValue });
};

const optionalNumberField = (initialValue?: number) => {
  return new NumberField({ required: false, nullable: true, initial: initialValue });
};

const requiredNullableNumberField = () =>
  new NumberField<number, number, true, true, false>({ required: true, nullable: true });

// Derived (persisted: false)

/**
 * A derived number field — in schema for FormulaFamiliar visibility and AE targeting,
 * but never written to the database. Resets to `initial` each prep cycle.
 */
const derivedNumberField = (initialValue: number = 0) =>
  new NumberField<number, number, true, false, true>({ required: true, nullable: false, initial: initialValue, persisted: false });

/**
 * A derived boolean field — in schema for FormulaFamiliar visibility and AE targeting,
 * but never written to the database. Resets to `initial` each prep cycle.
 */
const derivedBooleanField = (initialValue: boolean = false) =>
  new BooleanField<boolean, boolean, true, false, true>({ required: true, nullable: false, initial: initialValue, persisted: false });

// Formula
const formulaField = () => new SchemaField({
  formula: new StringField({ required: true, initial: '', nullable: false }),
  contexts: new ObjectField({ required: false, initial: {} }),
}, { required: false, nullable: true });

/**
 * Attach familiar metadata to any DataField so the schema walker
 * can auto-generate the formula autocomplete tree.
 */
function withFamiliar<T extends foundry.data.fields.DataField>(
  field: T,
  meta: FormulaFieldMeta
): T {
  (field.options as Record<string, unknown>).familiar = meta;
  return field;
}

interface SchemaFieldMeta {
  /** FormulaFamiliar schema walker metadata. */
  familiar?: FormulaFieldMeta;
  /** Whether this field supports identified/unidentified variants. Defaults to `true`. */
  identifiable?: boolean;
  /** Whether this field participates in secret masking. Defaults to `false` for derived fields, otherwise `true`. */
  maskable?: boolean;
  /** Masked write behavior. Defaults to `playerSecretRoute`. */
  maskedEditStrategy?: MaskedEditStrategy;
  /** Default visibility when no GM override is saved. */
  defaultVisibility?: FieldVisibility;
  /** Default editability when no GM override is saved. */
  defaultEditability?: FieldEditability;
  /** Whether the GM can change visibility on this field. */
  canVisibilityBeChanged?: boolean;
  /** Whether the GM can change editability on this field. */
  canEditabilityBeChanged?: boolean;
}

/**
 * Attach dnd35e field metadata to any DataField's options bag.
 * Replaces the old `new Dnd35eField(InnerClass, innerOpts, wrapperOpts)` pattern.
 *
 * @example
 * ```ts
 * schema.hardness = useDnd35eField(requiredNumberField(0), {
 *   defaultVisibility: 'ownerPlus',
 *   familiar: { aliases: ['hp'] },
 * });
 * ```
 */
function useDnd35eField<T extends foundry.data.fields.DataField>(
  field: T,
  meta: SchemaFieldMeta = {}
): T {
  const opts = field.options as Record<string, unknown>;
  opts.identifiable = meta.identifiable ?? true;
  opts.maskable = meta.maskable ?? (opts.persisted === false ? false : true);
  opts.maskedEditStrategy = meta.maskedEditStrategy ?? MASKED_EDIT_STRATEGY.PLAYER_SECRET_ROUTE;
  if (meta.familiar) opts.familiar = meta.familiar;
  if (meta.defaultVisibility) opts.defaultVisibility = meta.defaultVisibility;
  if (meta.defaultEditability) opts.defaultEditability = meta.defaultEditability;
  if (meta.canVisibilityBeChanged !== undefined) opts.canVisibilityBeChanged = meta.canVisibilityBeChanged;
  if (meta.canEditabilityBeChanged !== undefined) opts.canEditabilityBeChanged = meta.canEditabilityBeChanged;
  return field;
}

export type { SchemaFieldMeta };

export {
  derivedBooleanField,
  derivedNullableOptionalStringField,
  derivedNumberField,
  derivedOptionalStringField,
  formulaField,
  nullableOptionalStringField,
  optionalHtmlField,
  optionalNumberField,
  optionalStringField,
  requiredBooleanField,
  requiredNullableNumberField,
  requiredNullableStringField,
  requiredNumberField,
  requiredStringField,
  requiredTypedStringField,
  useDnd35eField,
  withFamiliar,
};
