import type { DocumentSystemModel } from '@documents/document/data/DocumentSystemModel.mjs';

type SystemModelCtor = AbstractConstructorOf<DocumentSystemModel<any>> & {
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
