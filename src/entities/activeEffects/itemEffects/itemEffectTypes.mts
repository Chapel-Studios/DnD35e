import { MaterialItemType } from '@itemEffects/material/Material.mjs';

const ITEM_EFFECT_TARGET = 'item';
type ItemEffectTarget = typeof ITEM_EFFECT_TARGET;

type ItemEffectType = MaterialItemType
// | 'enhancement';

const ITEM_EFFECT_TYPES = {
  material: 'TYPES.Item.material',
} as const satisfies Record<ItemEffectType, string>;

type ItemEffectTypeLocalizationValues = typeof ITEM_EFFECT_TYPES[keyof typeof ITEM_EFFECT_TYPES];

export {
  ITEM_EFFECT_TARGET,
  ITEM_EFFECT_TYPES,
};

export type {
  ItemEffectTarget,
  ItemEffectType,
  ItemEffectTypeLocalizationValues,
};
