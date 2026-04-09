import { MaterialEffectType } from './material/Material.mjs';

const EFFECT_TARGET = 'item';
type EffectTarget = typeof EFFECT_TARGET;

const BASE_EFFECT_TYPE = 'base';
type EffectType = typeof BASE_EFFECT_TYPE
  | MaterialEffectType
// | 'enhancement';

const EFFECT_TYPES = {
  base: 'Document.ActiveEffect',
  material: 'TYPES.Item.material',
} as const satisfies Record<EffectType, string>;

type EffectTypeLocalizationValues = typeof EFFECT_TYPES[keyof typeof EFFECT_TYPES];

export {
  BASE_EFFECT_TYPE,
  EFFECT_TARGET,
  EFFECT_TYPES,
};

export type {
  EffectTarget,
  EffectType,
  EffectTypeLocalizationValues,
};
