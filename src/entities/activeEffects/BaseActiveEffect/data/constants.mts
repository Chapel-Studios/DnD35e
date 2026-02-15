import { ItemEffectTarget } from '@entities/activeEffects/index.mjs';
import { ITEM_EFFECT_TARGET } from '@entities/activeEffects/itemEffects/itemEffectTypes.mjs';

type ActiveEffectTarget = ItemEffectTarget;
// | 'Actor';

const ACTIVE_EFFECT_TARGETS = {
  [ITEM_EFFECT_TARGET]: 'D35E.Item',
} as const satisfies Record<ActiveEffectTarget, string>;

type ActiveEffectTargetLocalizationValues = typeof ACTIVE_EFFECT_TARGETS[keyof typeof ACTIVE_EFFECT_TARGETS];

export {
  ACTIVE_EFFECT_TARGETS,
};

export type {
  ActiveEffectTarget,
  ActiveEffectTargetLocalizationValues,
};
