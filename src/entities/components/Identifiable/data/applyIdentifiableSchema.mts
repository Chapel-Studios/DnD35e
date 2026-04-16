import type { Dnd35eDocumentSystemModel } from '@ec/CoreMixin/data/Dnd35eDocumentSystemModel.mjs';
import {
  requiredBooleanField,
} from '@helpers/fieldBuilders.mjs';

type SystemModelCtor = AbstractConstructorOf<Dnd35eDocumentSystemModel<any>> & {
  defineSchema(): Record<string, any>;
  LOCALIZATION_PREFIXES: string[];
};

const IdentifiableSchemaMixin = <TBase extends SystemModelCtor>(base: TBase) => {
  abstract class IdentifiableSystemModel extends base {
    static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.IDENTIFIABLE'];

    static override defineSchema (): Record<string, any> {
      const schema = super.defineSchema();
      // Added to schema just so items can check if item has identifiable component, should always be true
      schema.isIdentifiable = requiredBooleanField(true);
      // Legacy unidentifiedDescription and unidentifiedPrice removed
      // Unidentified values are now stored inline on the relevant Dnd35eField via `.unidentifiedValue`
      schema.isIdentified = requiredBooleanField(true);
      
      return schema;
    }
  }
  return IdentifiableSystemModel;
};

export { IdentifiableSchemaMixin };
