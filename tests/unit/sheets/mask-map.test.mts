import { buildMaskMapFromSecretEffects, getDocumentMasks } from '@documents/document/sheet/maskMap.mjs';
import { EFFECT_CHANGE_TARGET, SYSTEM_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
import { secretEffectType } from '@effects/secret/secretEffectType.mjs';
import { describe, expect, it, vi } from 'vitest';

type ChangeLike = {
  key?: string;
  type?: string;
  target?: string;
  priority?: number;
  value?: unknown;
};

const mkEffect = (
  changes: ChangeLike[],
  opts: { active?: boolean; type?: string } = {}
) => ({
  active: opts.active ?? true,
  type: opts.type ?? secretEffectType,
  system: { changes },
}) as any;

describe('buildMaskMapFromSecretEffects', () => {
  it('returns undefined when no effects are present', () => {
    const result = buildMaskMapFromSecretEffects(undefined, EFFECT_CHANGE_TARGET.ACTOR, vi.fn());
    expect(result).toBeUndefined();
  });

  describe('getDocumentMasks', () => {
    it('uses an existing runtime mask dictionary before rebuilding from effects', () => {
      const actor = { documentName: 'Actor', _masks: { 'system.defense.concealment': 20 } };
      expect(getDocumentMasks(actor)).toBe(actor._masks);
    });

    it('rebuilds actor masks from active secret effects when no dictionary exists', () => {
      const actor = {
        documentName: 'Actor',
        effects: [mkEffect([{ key: 'system.defense.concealment', type: SYSTEM_CHANGE_TYPE.MASK, value: 20 }])],
      };
      expect(getDocumentMasks(actor)).toEqual({ 'system.defense.concealment': 20 });
    });

    it('does not rebuild actor-targeted masks for other document types', () => {
      const item = {
        documentName: 'Item',
        effects: [mkEffect([{ key: 'system.defense.concealment', type: SYSTEM_CHANGE_TYPE.MASK, value: 20 }])],
      };
      expect(getDocumentMasks(item)).toBeUndefined();
    });
  });

  it('keeps only active secret MASK changes for the desired target', () => {
    const resolver = vi.fn((_effect, change) => change.value);
    const effects = [
      mkEffect([{ key: 'system.hp.current', type: SYSTEM_CHANGE_TYPE.MASK, target: EFFECT_CHANGE_TARGET.ACTOR, value: 10 }]),
      mkEffect([{ key: 'system.hp.temp', type: SYSTEM_CHANGE_TYPE.MASK, target: EFFECT_CHANGE_TARGET.ITEM, value: 99 }]),
      mkEffect([{ key: 'system.hp.nonlethal', type: 'add', target: EFFECT_CHANGE_TARGET.ACTOR, value: 5 }]),
      mkEffect([{ key: 'system.hp.max', type: SYSTEM_CHANGE_TYPE.MASK, target: EFFECT_CHANGE_TARGET.ACTOR, value: 50 }], { active: false }),
      mkEffect([{ key: 'system.hp.max', type: SYSTEM_CHANGE_TYPE.MASK, target: EFFECT_CHANGE_TARGET.ACTOR, value: 60 }], { type: 'material' }),
    ];

    const result = buildMaskMapFromSecretEffects(effects, EFFECT_CHANGE_TARGET.ACTOR, resolver);

    expect(result).toEqual({
      'system.hp.current': 10,
    });
  });

  it('uses priority descending and first-wins per key', () => {
    const resolver = vi.fn((_effect, change) => change.value);
    const effects = [
      mkEffect([
        { key: 'system.hp.current', type: SYSTEM_CHANGE_TYPE.MASK, target: EFFECT_CHANGE_TARGET.ACTOR, priority: 1, value: 5 },
      ]),
      mkEffect([
        { key: 'system.hp.current', type: SYSTEM_CHANGE_TYPE.MASK, target: EFFECT_CHANGE_TARGET.ACTOR, priority: 20, value: 12 },
      ]),
      mkEffect([
        { key: 'system.hp.temp', type: SYSTEM_CHANGE_TYPE.MASK, target: EFFECT_CHANGE_TARGET.ACTOR, priority: 3, value: 7 },
      ]),
    ];

    const result = buildMaskMapFromSecretEffects(effects, EFFECT_CHANGE_TARGET.ACTOR, resolver);

    expect(result).toEqual({
      'system.hp.current': 12,
      'system.hp.temp': 7,
    });
  });

  it('defaults missing change target to desiredTarget', () => {
    const resolver = vi.fn((_effect, change) => change.value);
    const effects = [
      mkEffect([
        { key: 'system.hp.current', type: SYSTEM_CHANGE_TYPE.MASK, value: 11 },
      ]),
    ];

    const result = buildMaskMapFromSecretEffects(effects, EFFECT_CHANGE_TARGET.ACTOR, resolver);
    expect(result).toEqual({ 'system.hp.current': 11 });
  });
});