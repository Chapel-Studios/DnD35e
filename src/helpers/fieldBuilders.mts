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
const requiredStringField = (label: string, hint: string, initialValue?: string) => {
  return new StringField<string, string, true, false, true>({ required: true, nullable: false, initial: initialValue ?? '', label, hint });
};
const requiredNullableStringField = (label: string, hint: string, initialValue?: string) => {
  return new StringField<string, string, true, false, true>({ initial: initialValue ?? '', required: true, blank: true, label, hint });
};

const nullableOptionalStringField = (label: string, hint: string, initialValue?: string) => {
  return new StringField<string, string, false, true, true>({ required: false, blank: true, initial: initialValue ?? undefined, label, hint });
};

const optionalStringField = (label: string, hint: string, initialValue?: string) => {
  return new StringField<string, string, false, false, true>({ required: false, blank: true, initial: initialValue ?? undefined, label, hint });
};

const requiredTypedStringField = <TChoice extends string> (
  label: string,
  hint: string,
  choices: readonly TChoice[] | Set<TChoice>,
  initial: TChoice,
  blank: boolean = false
) => {
  return new StringField<TChoice, TChoice, true, false, true>({
    choices: Array.from(choices),
    initial,
    required: true,
    blank,
    label,
    hint,
  });
};

// HTML
const optionalHtmlField = (label: string, hint: string) =>
  new HTMLField({ required: false, nullable: false, blank: true, label, hint });

// Bools
const requiredBooleanField = (label: string, hint: string, initialValue?: boolean) => {
  if (initialValue === undefined) {
    initialValue = false;
  }
  return new BooleanField<boolean, boolean, true, false, true>({ required: true, nullable: false, initial: initialValue, label, hint });
};

// Numbers
const requiredNumberField = (label: string, hint: string, initialValue?: number) => {
  if (initialValue === undefined) {
    initialValue = 0;
  }
  return new NumberField<number, number, true, false, true>({ required: true, nullable: false, initial: initialValue, label, hint });
};

const optionalNumberField = (label: string, hint: string, initialValue?: number) => {
  return new NumberField({ required: false, nullable: true, initial: initialValue, label, hint });
};

const requiredNullableNumberField = (label: string, hint: string) =>
  new NumberField<number, number, true, true, false>({ required: true, nullable: true, label, hint });

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
