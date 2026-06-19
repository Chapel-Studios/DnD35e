import type { EffectChangeTarget } from '@effects/baseActiveEffect/data/constants.mjs';
import { EFFECT_CHANGE_TARGET, SYSTEM_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/index.mjs';
import type { ActiveEffectDnd35e } from '@effects/index.mjs';
import { secretEffectType } from '@effects/secret/secretEffectType.mjs';

type MaskCandidate = {
  key: string;
  value: unknown;
  priority: number;
};

const buildMaskMapFromSecretEffects = (
  effects: Iterable<ActiveEffectDnd35e> | undefined,
  desiredTarget: EffectChangeTarget,
  resolveMaskValue: (effect: ActiveEffectDnd35e, change: EffectChangeDataDnd35e) => unknown
): Record<string, unknown> | undefined => {
  if (!effects) return undefined;

  const masks: Record<string, unknown> = {};
  const candidates: MaskCandidate[] = [];

  for (const effect of effects) {
    if (effect.type !== secretEffectType || !effect.active) continue;
    for (const change of effect.system.changes) {
      if (change.type !== SYSTEM_CHANGE_TYPE.MASK || !change.key) continue;
      const target = change.target ?? EFFECT_CHANGE_TARGET.ACTOR;
      if (target !== desiredTarget) continue;

      candidates.push({
        key: change.key,
        value: resolveMaskValue(effect, change),
        priority: change.priority ?? 0,
      });
    }
  }

  candidates.sort((a, b) => b.priority - a.priority);
  for (const { key, value } of candidates) {
    if (key in masks) continue;
    masks[key] = value;
  }

  return Object.keys(masks).length ? masks : undefined;
};

export { buildMaskMapFromSecretEffects };
export type { MaskCandidate };
