import { Dnd35eDocumentSystemModel } from '@ec/CoreMixin/data/Dnd35eDocumentSystemModel.mjs';

abstract class ActorSystemModelBase extends Dnd35eDocumentSystemModel<foundry.documents.Actor> {
  static override defineSchema (): Record<string, any> {
    const schema = super.defineSchema();

    return schema;
  }
}

export {
  ActorSystemModelBase,
};
