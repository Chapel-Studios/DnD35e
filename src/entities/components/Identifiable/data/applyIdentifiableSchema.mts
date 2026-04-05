import { Dnd35eDocumentSystemModel } from '@ec/CoreMixin/data/Dnd35eDocumentSystemModel.mjs';
import {
  requiredBooleanField,
} from '@helpers/fieldBuilders.mjs';

type SystemModelCtor = AbstractConstructorOf<Dnd35eDocumentSystemModel<any>> & {
  defineSchema(): Record<string, any>;
};

const IdentifiableSchemaMixin = <TBase extends SystemModelCtor>(base: TBase) => {
  abstract class IdentifiableSystemModel extends base {
    static override defineSchema (): Record<string, any> {
      const schema = super.defineSchema();
      // Added to schema just so items can check if item has identifiable component, should always be true
      schema.isIdentifiable = requiredBooleanField('D35E.IsIdentifiable', 'D35E.IsIdentifiableHint', true);
      // Legacy unidentifiedDescription and unidentifiedPrice removed
      // These are now stored in flags.dnd35e.unidentifiedOverrides
      schema.isIdentified = requiredBooleanField('D35E.IsIdentified', 'D35E.IsIdentifiedHint', true);
      
      return schema;
    }
  }
  return IdentifiableSystemModel;
};

export { IdentifiableSchemaMixin };
