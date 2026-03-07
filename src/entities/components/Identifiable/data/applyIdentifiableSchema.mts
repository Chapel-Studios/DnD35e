import { Dnd35eDocumentSystemModel } from '@ec/CoreMixin/data/Dnd35eDocumentSystemModel.mjs';
import {
  formulaField,
  optionalHtmlField,
  requiredBooleanField,
  requiredNullableNumberField,
  requiredStringField,
} from '@helpers/fieldBuilders.mjs';

const applyIdentifiableSchema = (schema: Record<string, any>) => {
  schema.isIdentified = requiredBooleanField(false);
  // TODO: Remove isIdentifiable field - move to always-identifiable approach
  // This field was originally added to reduce UI clutter by hiding identification UI.
  // However, the new UI design is clean enough that we can always show identification features.
  // When removing:
  // 1. Remove the isIdentifiable field from the schema and system data
  // 2. Simplify the visibility logic in IdentifiableDocumentStore
  // 3. Remove the identifiableBanner component from detail tabs and delete it entirely
  // 4. Remove the IdentifiableConfig component from detail tabs and delete it entirely
  schema.isIdentifiable = requiredBooleanField(true);

};

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
      schema.derivedUnidentifiedName = requiredStringField();
      schema.unidentifiedNameFormula = formulaField();
      
      return schema;
    }
  }
  return IdentifiableSystemModel;
};

export { applyIdentifiableSchema, IdentifiableSchemaMixin };
