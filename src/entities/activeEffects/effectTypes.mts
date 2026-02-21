import { MaterialItemType } from './material/Material.mjs';

const EFFECT_TARGET = 'item';
type EffectTarget = typeof EFFECT_TARGET;

type EffectType = MaterialItemType
// | 'enhancement';

const EFFECT_TYPES = {
  material: 'TYPES.Item.material',
} as const satisfies Record<EffectType, string>;

type EffectTypeLocalizationValues = typeof EFFECT_TYPES[keyof typeof EFFECT_TYPES];

export {
  EFFECT_TARGET,
  EFFECT_TYPES,
};

export type {
  EffectTarget,
  EffectType,
  EffectTypeLocalizationValues,
};
