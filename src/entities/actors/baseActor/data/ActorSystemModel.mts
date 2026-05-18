import { DocumentSystemModel } from '@ec/CoreMixin/data/DocumentSystemModel.mjs';

import type { ActorSystemData } from './ActorSystemData.mjs';

abstract class ActorSystemModel extends DocumentSystemModel<foundry.documents.Actor> {
  static override defineSchema (): Record<string, any> {
    const schema = super.defineSchema();

    return schema;
  }
}

interface ActorSystemModel extends ActorSystemData {}

export {
  ActorSystemModel,
};
