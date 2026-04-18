import type { Dnd35eDocumentSystemModel } from '@ec/CoreMixin/data/Dnd35eDocumentSystemModel.mjs';

type SystemModelCtor = AbstractConstructorOf<Dnd35eDocumentSystemModel<any>> & {
  defineSchema(): Record<string, any>;
  LOCALIZATION_PREFIXES: string[];
};

const IdentifiableSchemaMixin = <TBase extends SystemModelCtor>(base: TBase) => {
  abstract class IdentifiableSystemModel extends base {
    static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.IDENTIFIABLE'];
  }
  return IdentifiableSystemModel;
};

export { IdentifiableSchemaMixin };
