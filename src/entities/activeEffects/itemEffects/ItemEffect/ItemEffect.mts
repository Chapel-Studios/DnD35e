import { EffectChangeData } from '@common/documents/active-effect.mjs';
import { DnD35eActiveEffect } from '@effects/index.mjs';
import { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';

type ItemEffectChangeData = EffectChangeData<ItemDnd35e>;

abstract class ItemEffect extends DnD35eActiveEffect {
  override get transfer() {
    return false;
  }
}

export { ItemEffect };

export type {
  ItemEffectChangeData,
};
