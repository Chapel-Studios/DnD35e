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

interface Dnd35eFieldMeta {
  /** FormulaFamiliar schema walker metadata. */
  familiar?: FormulaFieldMeta;
  /** Whether this field supports identified/unidentified variants. Defaults to `true`. */
  identifiable?: boolean;
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
  meta: Dnd35eFieldMeta = {}
): T {
  const opts = field.options as Record<string, unknown>;
  opts.identifiable = meta.identifiable ?? true;
  if (meta.familiar) opts.familiar = meta.familiar;
  if (meta.defaultVisibility) opts.defaultVisibility = meta.defaultVisibility;
  if (meta.defaultEditability) opts.defaultEditability = meta.defaultEditability;
  if (meta.canVisibilityBeChanged !== undefined) opts.canVisibilityBeChanged = meta.canVisibilityBeChanged;
  if (meta.canEditabilityBeChanged !== undefined) opts.canEditabilityBeChanged = meta.canEditabilityBeChanged;
  return field;
}

export {
  type Dnd35eFieldMeta,
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
