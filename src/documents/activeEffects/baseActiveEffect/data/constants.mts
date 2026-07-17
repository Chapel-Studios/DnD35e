import type { EffectTarget } from '@effects/effectTypes.mjs';
import { ACTOR_EFFECT_TARGET, EFFECT_TARGET } from '@effects/effectTypes.mjs';

type ActiveEffectTarget = EffectTarget;

const ACTIVE_EFFECT_TARGETS = {
  [EFFECT_TARGET]: 'dnd35e.COMMON.Item',
  [ACTOR_EFFECT_TARGET]: 'dnd35e.COMMON.Actor',
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
  [EFFECT_CHANGE_TARGET.ITEM]: 'dnd35e.EFFECT.ChangeTarget.Item',
  [EFFECT_CHANGE_TARGET.ACTOR]: 'dnd35e.EFFECT.ChangeTarget.Actor',
} as const satisfies Record<EffectChangeTarget, string>;

/**
 * String-based effect change types matching Foundry v14+ CONST.ACTIVE_EFFECT_CHANGE_TYPES keys.
 * Use these instead of the deprecated CONST.ACTIVE_EFFECT_MODES (removed in v16).
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

/**
 * System-registered change types beyond Foundry's built-in set.
 * These are registered in CONFIG.ActiveEffect.changeTypes at init.
 */
const CHANGE_TYPE = {
  /** FormulaFamiliar change type — provides autocomplete context, not value changes. */
  FAMILIAR: 'familiar',
  /** MASK change type — defines masked (fake) values for Secret AEs. Not applied via stacking. */
  MASK: 'mask',
} as const;

/** All valid change types (Foundry built-in + system-registered) as a flat array for schema choices. */
const ALL_CHANGE_TYPES = [
  ...Object.values(EFFECT_CHANGE_TYPE),
  ...Object.values(CHANGE_TYPE),
] as const;

const INITIAL_EFFECT_CHANGE_PHASE = 'initial';
const FINAL_EFFECT_CHANGE_PHASE = 'final';
const CORE_EFFECT_CHANGE_PHASE = 'core';

const EFFECT_CHANGE_PHASES = [
  CORE_EFFECT_CHANGE_PHASE,
  INITIAL_EFFECT_CHANGE_PHASE,
  FINAL_EFFECT_CHANGE_PHASE,
] as const;

type EffectChangeType = typeof EFFECT_CHANGE_TYPE[keyof typeof EFFECT_CHANGE_TYPE] | ChangeType;
type ChangeType = typeof CHANGE_TYPE[keyof typeof CHANGE_TYPE];
type EffectChangePhase = typeof EFFECT_CHANGE_PHASES[number];

export {
  ACTIVE_EFFECT_TARGETS,
  ALL_CHANGE_TYPES,
  CORE_EFFECT_CHANGE_PHASE,
  EFFECT_CHANGE_PHASES,
  EFFECT_CHANGE_TARGET,
  EFFECT_CHANGE_TARGETS,
  EFFECT_CHANGE_TYPE,
  FINAL_EFFECT_CHANGE_PHASE,
  INITIAL_EFFECT_CHANGE_PHASE,
  CHANGE_TYPE as SYSTEM_CHANGE_TYPE,
};

export type {
  ActiveEffectTarget,
  ActiveEffectTargetLocalizationValues,
  ChangeType,
  EffectChangePhase,
  EffectChangeTarget,
  EffectChangeType,
};
