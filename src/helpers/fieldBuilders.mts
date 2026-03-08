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

const requiredTypedStringField = <TChoices extends readonly string[] | Set<string>> (
  choices: TChoices,
  initial: string,
  blank: boolean = false
) => {
  return new StringField<string, string, true, false, true>({
    choices: [...choices],
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
};
