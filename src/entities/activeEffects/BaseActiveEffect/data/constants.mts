import { ItemEffectTarget } from '@entities/activeEffects/index.mjs';
import { ITEM_EFFECT_TARGET } from '@entities/activeEffects/itemEffects/itemEffectTypes.mjs';

type ActiveEffectTarget = ItemEffectTarget;
// | 'Actor';

const ACTIVE_EFFECT_TARGETS = {
  [ITEM_EFFECT_TARGET]: 'D35E.Item',
} as const satisfies Record<ActiveEffectTarget, string>;

type ActiveEffectTargetLocalizationValues = typeof ACTIVE_EFFECT_TARGETS[keyof typeof ACTIVE_EFFECT_TARGETS];

/**
 * String-based effect change types matching Foundry v14+ CONST.ACTIVE_EFFECT_CHANGE_TYPES keys.
 * Use these instead of numeric CONST.ACTIVE_EFFECT_MODES.
 */
const EFFECT_CHANGE_TYPE = {
  CUSTOM: 'custom',
  MULTIPLY: 'multiply',
  ADD: 'add',
  SUBTRACT: 'subtract',
  DOWNGRADE: 'downgrade',
  UPGRADE: 'upgrade',
  OVERRIDE: 'override',
} as const;

const INITIAL_EFFECT_CHANGE_PHASE = 'initial';
const FINAL_EFFECT_CHANGE_PHASE = 'final';

const EFFECT_CHANGE_PHASES = [
  INITIAL_EFFECT_CHANGE_PHASE,
  FINAL_EFFECT_CHANGE_PHASE,
] as const;

type EffectChangeType = typeof EFFECT_CHANGE_TYPE[keyof typeof EFFECT_CHANGE_TYPE];
type EffectChangePhase = typeof EFFECT_CHANGE_PHASES[keyof typeof EFFECT_CHANGE_PHASES];

export {
  ACTIVE_EFFECT_TARGETS,
  EFFECT_CHANGE_PHASES,
  EFFECT_CHANGE_TYPE,
  FINAL_EFFECT_CHANGE_PHASE,
  INITIAL_EFFECT_CHANGE_PHASE,
};

export type {
  ActiveEffectTarget,
  ActiveEffectTargetLocalizationValues,
  EffectChangePhase,
  EffectChangeType,
};
