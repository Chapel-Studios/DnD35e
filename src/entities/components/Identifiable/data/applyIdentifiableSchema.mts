import { Dnd35eDocumentSystemModel } from '@ec/CoreMixin/data/Dnd35eDocumentSystemModel.mjs';
import {
  formulaField,
  optionalHtmlField,
  requiredBooleanField,
  requiredNullableNumberField,
  requiredStringField,
} from '@helpers/fieldBuilders.mjs';

type SystemModelCtor = AbstractConstructorOf<Dnd35eDocumentSystemModel<any>> & {
  defineSchema(): Record<string, any>;
};

const IdentifiableSchemaMixin = <TBase extends SystemModelCtor>(base: TBase) => {
  abstract class IdentifiableSystemModel extends base {
    static override defineSchema (): Record<string, any> {
      const schema = super.defineSchema();
      schema.unidentifiedDescription = optionalHtmlField();
      schema.unidentifiedPrice = requiredNullableNumberField();
      schema.isIdentified = requiredBooleanField(false);
      schema.derivedUnidentifiedName = requiredStringField('');
      schema.unidentifiedNameFormula = formulaField();
      
      return schema;
    }
  }
  return IdentifiableSystemModel;
};

export { IdentifiableSchemaMixin };
