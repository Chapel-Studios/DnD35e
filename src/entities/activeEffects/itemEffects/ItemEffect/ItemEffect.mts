import type { EffectChangeData } from '@common/documents/active-effect.mjs';
import { DnD35eActiveEffect } from '@effects/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';

import { ITEM_EFFECT_TYPES, ItemEffectType } from '../index.mjs';

type ItemEffectChangeData = EffectChangeData<ItemDnd35e>;

abstract class ItemEffect extends DnD35eActiveEffect {
  declare type: ItemEffectType;

  override get transfer() {
    return false;
  }
  
  get localizedType (): string {
    return ITEM_EFFECT_TYPES[this.type] ??
      'D35E.Item';
  }
}

export { ItemEffect };

export type {
  ItemEffectChangeData,
};
