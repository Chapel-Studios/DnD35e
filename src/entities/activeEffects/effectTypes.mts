import type { GeneralEffectType } from '@effects/general/index.mjs';

import type { MaterialEffectType } from './material/Material.mjs';

const EFFECT_TARGET = 'item';
type EffectTarget = typeof EFFECT_TARGET;

const GENERAL_EFFECT_TYPE = 'general' as const;
type EffectType = GeneralEffectType
  | MaterialEffectType
// | 'enhancement';

const EFFECT_TYPES = {
  general: 'Document.ActiveEffect',
  material: 'TYPES.Item.material',
} as const satisfies Record<EffectType, string>;

type EffectTypeLocalizationValues = typeof EFFECT_TYPES[keyof typeof EFFECT_TYPES];

export {
  EFFECT_TARGET,
  EFFECT_TYPES,
  GENERAL_EFFECT_TYPE,
};

export type {
  EffectTarget,
  EffectType,
  EffectTypeLocalizationValues,
};
