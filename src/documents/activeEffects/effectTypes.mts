import type { General, GeneralEffectType } from '@effects/general/index.mjs';

import type { Containment } from './containment/Containment.mjs';
import type { ContainmentEffectType } from './containment/containmentEffectType.mjs';
import type { Material } from './material/index.mjs';
import type { MaterialEffectType } from './material/materialEffectType.mjs';
import type { Secret } from './secret/Secret.mjs';
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

type HIDDEN_ACTIVE_EFFECTS = Secret | Containment;
type VISIBLE_ACTIVE_EFFECTS = General | Material;
type ACTIVE_EFFECTS_DND35E = HIDDEN_ACTIVE_EFFECTS | VISIBLE_ACTIVE_EFFECTS;

/**
 * Types always exposed in the AE creation dialog. Secret is excluded here - it's only
 * added to the dialog's type list for GM users, via `createEffect`'s `additionalTypes`
 * param (see `PhysicalItemStore`), so players never see it as a creatable option.
 */
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
  ACTIVE_EFFECTS_DND35E,
  EffectTarget,
  EffectType,
  EffectTypeLocalizationValues,
  HIDDEN_ACTIVE_EFFECTS,
  VISIBLE_ACTIVE_EFFECTS,
};
