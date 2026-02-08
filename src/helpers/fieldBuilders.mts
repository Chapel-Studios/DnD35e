const {
  StringField,
  HTMLField,
  BooleanField,
  NumberField,
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

const requiredTypedStringField = <TChoices extends readonly string[]> (
  choices: TChoices,
  initial: string,
  blank: boolean = false,
) => new StringField<TChoices[number], TChoices[number], true, false, true>({
  choices,
  initial,
  required: true,
  blank,
});

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

export {
  requiredStringField,
  requiredNullableStringField,
  optionalStringField,
  nullableOptionalStringField,
  requiredTypedStringField,

  optionalHtmlField,

  requiredBooleanField,

  requiredNumberField,
  requiredNullableNumberField,
  optionalNumberField,
};
