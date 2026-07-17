import type { GeneralEffectType } from '@effects/general/index.mjs';

import type { ContainmentEffectType } from './containment/containmentEffectType.mjs';
import type { MaterialEffectType } from './material/materialEffectType.mjs';
import type { SecretEffectType } from './secret/secretEffectType.mjs';

const EFFECT_TARGET = 'item';
const ACTOR_EFFECT_TARGET = 'actor';
type EffectTarget = typeof EFFECT_TARGET | typeof ACTOR_EFFECT_TARGET;

const GENERAL_EFFECT_TYPE = 'general' as const;
type EffectType = GeneralEffectType
  | MaterialEffectType
  | SecretEffectType
  | ContainmentEffectType
// | 'enhancement';

/** Types exposed in the AE creation dialog. Secret is excluded — created only via dedicated UI. */
const EFFECT_TYPES = {
  general: 'Document.ActiveEffect',
  material: 'TYPES.Item.material',
} as const satisfies Partial<Record<EffectType, string>>;

type EffectTypeLocalizationValues = typeof EFFECT_TYPES[keyof typeof EFFECT_TYPES];

export {
  ACTOR_EFFECT_TARGET,
  EFFECT_TARGET,
  EFFECT_TYPES,
  GENERAL_EFFECT_TYPE,
};

export type {
  EffectTarget,
  EffectType,
  EffectTypeLocalizationValues,
};
