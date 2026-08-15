import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import { buildDocumentDataMap } from '@helpers/formulae/utils.mjs';

import { SYSTEM_ID } from '../shared.mjs';
import { COMBAT_KEYS } from './constants.mjs';

type DeathThresholdSetting = string;

interface ActorDeathThresholdOverride {
  useDeathThresholdOverride: boolean;
  formula: string;
}

const USE_DEATH_THRESHOLD_OVERRIDE_FLAG = 'useDeathThresholdOverride';
const DEATH_THRESHOLD_OVERRIDE_FORMULA_FLAG = 'deathThresholdOverrideFormula';

const PARTY_MEMBER_DEATH_THRESHOLD_DEFAULT: DeathThresholdSetting = '-10';

const STANDARD_ACTOR_DEATH_THRESHOLD_DEFAULT: DeathThresholdSetting = '0';

const normalizeDeathThresholdFormula = (value: string): string => {
  return value.trim();
};

const normalizeDeathThresholdSetting = (
  value: unknown,
  fallback: DeathThresholdSetting
): DeathThresholdSetting => {
  if (typeof value === 'string') {
    const formula = normalizeDeathThresholdFormula(value);
    return formula || fallback;
  }

  return fallback;
};

const resolveDeathThresholdValue = (setting: DeathThresholdSetting, actor?: ActorDnd35e): number => {
  const normalizedFormula = normalizeDeathThresholdFormula(setting || '');
  if (!normalizedFormula) {
    return 0;
  }

  const resolvedFormula = actor
    ? FormulaData.resolveSource(
      FormulaData.toSource(normalizedFormula, { expectedType: 'number' }),
      buildDocumentDataMap(actor),
      '0'
    )
    : normalizedFormula;

  if (resolvedFormula) {
    try {
      const evaluated = Roll.safeEval(resolvedFormula);
      if (Number.isFinite(evaluated)) return evaluated;

      const parsed = Number.parseFloat(resolvedFormula);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    } catch {
      // Fall through to numeric parsing when formula evaluation fails.
    }
  }

  return 0;
};

const getWorldDeathThresholdSetting = (isPartyMember: boolean): DeathThresholdSetting => {
  const key = isPartyMember
    ? COMBAT_KEYS.PARTY_MEMBER_DEATH_THRESHOLD
    : COMBAT_KEYS.STANDARD_ACTOR_DEATH_THRESHOLD;

  const fallback = isPartyMember ? PARTY_MEMBER_DEATH_THRESHOLD_DEFAULT : STANDARD_ACTOR_DEATH_THRESHOLD_DEFAULT;
  const configuredValue = game.settings.get(SYSTEM_ID, key);
  return normalizeDeathThresholdSetting(configuredValue, fallback);
};

const getActorDeathThresholdOverride = (actor: ActorDnd35e): ActorDeathThresholdOverride | undefined => {
  const useOverride = Boolean(actor.getFlag(SYSTEM_ID, USE_DEATH_THRESHOLD_OVERRIDE_FLAG));
  if (!useOverride) return undefined;

  const formula = actor.getFlag(SYSTEM_ID, DEATH_THRESHOLD_OVERRIDE_FORMULA_FLAG);
  return {
    useDeathThresholdOverride: true,
    formula: typeof formula === 'string' ? normalizeDeathThresholdFormula(formula) : '',
  };
};

const getActorDeathThresholdSetting = (actor: ActorDnd35e): DeathThresholdSetting => {
  const isPartyMember = Boolean(foundry.utils.getProperty(actor, 'system.settings.isPartyMember'));
  const worldSetting = getWorldDeathThresholdSetting(isPartyMember);
  const override = getActorDeathThresholdOverride(actor);

  if (!override?.useDeathThresholdOverride) {
    return worldSetting;
  }

  return normalizeDeathThresholdFormula(override.formula) || worldSetting;
};

const getActorDeathThreshold = (actor: ActorDnd35e): number => {
  const setting = getActorDeathThresholdSetting(actor);
  return resolveDeathThresholdValue(setting, actor);
};

export {
  DEATH_THRESHOLD_OVERRIDE_FORMULA_FLAG,
  getActorDeathThreshold,
  getActorDeathThresholdOverride,
  getActorDeathThresholdSetting,
  getWorldDeathThresholdSetting,
  normalizeDeathThresholdSetting,
  PARTY_MEMBER_DEATH_THRESHOLD_DEFAULT,
  resolveDeathThresholdValue,
  STANDARD_ACTOR_DEATH_THRESHOLD_DEFAULT,
  USE_DEATH_THRESHOLD_OVERRIDE_FLAG,
};

export type {
  ActorDeathThresholdOverride,
  DeathThresholdSetting,
};
