import type { FormulaFieldMeta } from '@helpers/formulae/types.mjs';

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

export {
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
  withFamiliar,
};
