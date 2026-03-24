import { EffectTarget } from '@effects/effectTypes.mjs';
import { EFFECT_TARGET } from '@effects/effectTypes.mjs';

type ActiveEffectTarget = EffectTarget;
// | 'Actor';

const ACTIVE_EFFECT_TARGETS = {
  [EFFECT_TARGET]: 'D35E.Item',
} as const satisfies Record<ActiveEffectTarget, string>;

type ActiveEffectTargetLocalizationValues = typeof ACTIVE_EFFECT_TARGETS[keyof typeof ACTIVE_EFFECT_TARGETS];

/**
 * Per-change target types. Each change can independently target the item or actor.
 */
const EFFECT_CHANGE_TARGET = {
  ITEM: 'item',
  ACTOR: 'actor',
} as const;

type EffectChangeTarget = typeof EFFECT_CHANGE_TARGET[keyof typeof EFFECT_CHANGE_TARGET];

const EFFECT_CHANGE_TARGETS = {
  [EFFECT_CHANGE_TARGET.ITEM]: 'D35E.EffectChangeTarget.Item',
  [EFFECT_CHANGE_TARGET.ACTOR]: 'D35E.EffectChangeTarget.Actor',
} as const satisfies Record<EffectChangeTarget, string>;

/**
 * String-based effect change types matching Foundry v14+ CONST.ACTIVE_EFFECT_CHANGE_TYPES keys.
 * Use these instead of the deprecated CONST.ACTIVE_EFFECT_MODES (removed in v16).
 */
const EFFECT_CHANGE_TYPE = {
  CUSTOM: 'custom',
  MULTIPLY: 'multiply',
  ADD: 'add',
  // SUBTRACT: 'subtract',
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
  EFFECT_CHANGE_TARGET,
  EFFECT_CHANGE_TARGETS,
  EFFECT_CHANGE_TYPE,
  FINAL_EFFECT_CHANGE_PHASE,
  INITIAL_EFFECT_CHANGE_PHASE,
};

export type {
  ActiveEffectTarget,
  ActiveEffectTargetLocalizationValues,
  EffectChangePhase,
  EffectChangeTarget,
  EffectChangeType,
};
