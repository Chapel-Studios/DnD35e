import { ActiveEffectSystemModelBase } from '@entities/activeEffects/BaseActiveEffect/data/ActiveEffectSystemModelBase.mjs';

class ItemEffectSystemModel extends ActiveEffectSystemModelBase {
  static override defineSchema () {
    const schema = super.defineSchema();

    return schema;
  }
}

export {
  ItemEffectSystemModel,
};
