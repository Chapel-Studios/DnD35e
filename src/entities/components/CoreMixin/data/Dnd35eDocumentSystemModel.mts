import {
  formulaField,
  optionalStringField,
  requiredStringField,
} from '@helpers/fieldBuilders.mjs';

const {
  HTMLField,
  SchemaField,
} = foundry.data.fields;

abstract class Dnd35eDocumentSystemModel<TDocType extends foundry.abstract.DataModel | null> extends foundry.abstract.TypeDataModel<
  TDocType,
  foundry.abstract.DataSchema
> {
  declare parent: TDocType;

  static override defineSchema(): Record<string, any> {
    const schema = {
      version: requiredStringField('1.0.0'),
      uniqueId: optionalStringField(),
      derivedName: requiredStringField(),
      nameFormula: formulaField(),
      description: new SchemaField({
        value: new HTMLField(),
      }),
    };
    return schema;
  }
}

export {
  Dnd35eDocumentSystemModel,
};
