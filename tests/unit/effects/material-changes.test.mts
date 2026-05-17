import { BONUS_TYPE_BROKEN, BONUS_TYPE_MASTERWORK, BONUS_TYPE_MATERIAL, BONUS_TYPE_UNTYPED } from '@constants/bonusTypes.mjs';
import type { Dnd35eEffectChangeData } from '@effects/BaseActiveEffect/data/ActiveEffectSystemData.mjs';
import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE } from '@effects/BaseActiveEffect/data/constants.mjs';
import {
  buildMaterialChanges,
  type BuildMaterialChangesInput,
} from '@effects/material/data/buildMaterialChanges.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Helper: build a complete input with sensible empty defaults so each test
 * only declares the fields it cares about.
 */
function mkInput (partial: Partial<BuildMaterialChangesInput> = {}): BuildMaterialChangesInput {
  return {
    materialSubtype: 'standard',
    price: { isEmpty: true },
    magicEquivalency: 0,
    hardness: 0,
    bonusHp: 0,
    damageReductionTypes: [],
    existingChanges: [],
    ...partial,
  };
}

/**
 * Helper: build an existing system change for a given key + type. The other
 * fields are placeholders — only `key`, `type`, and `isSystem` matter for the
 * type-preservation logic.
 */
function mkSystemChange (key: string, type: Dnd35eEffectChangeData['type']): Dnd35eEffectChangeData {
  return {
    key,
    type,
    value: 0,
    phase: 'final',
    priority: 10,
    target: EFFECT_CHANGE_TARGET.ITEM,
    effect: null,
    isSystem: true,
    bonusType: BONUS_TYPE_MATERIAL,
  };
}

describe('buildMaterialChanges', () => {
  it('empty input → no changes', () => {
    expect(buildMaterialChanges(mkInput())).toEqual([]);
  });

  it('preserves user-authored (non-system) changes verbatim', () => {
    const userChange: Dnd35eEffectChangeData = {
      key: 'system.attackBonus',
      type: EFFECT_CHANGE_TYPE.ADD,
      value: 1,
      phase: 'final',
      priority: 20,
      target: EFFECT_CHANGE_TARGET.ITEM,
      effect: null,
      isSystem: false,
      bonusType: BONUS_TYPE_UNTYPED,
    };
    const result = buildMaterialChanges(mkInput({ existingChanges: [userChange] }));
    expect(result).toEqual([userChange]);
  });

  it('drops existing system changes (regenerated from current field values)', () => {
    const staleSystem = mkSystemChange('system.hardness', EFFECT_CHANGE_TYPE.ADD);
    const result = buildMaterialChanges(mkInput({
      existingChanges: [staleSystem],
      // hardness is 0 → no new system change emitted; stale one must be dropped
    }));
    expect(result).toEqual([]);
  });

  it('emits one system change per non-zero numeric field', () => {
    const result = buildMaterialChanges(mkInput({
      magicEquivalency: 2,
      hardness: 5,
      bonusHp: 10,
    }));
    expect(result).toHaveLength(3);
    expect(result.map(c => c.key)).toEqual([
      'system.magicEquivalency',
      'system.hardness',
      'system.hp.max',
    ]);
  });

  it('emits a system change for non-empty price', () => {
    const price = { isEmpty: false };
    const result = buildMaterialChanges(mkInput({ price }));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      key: 'system.price',
      type: EFFECT_CHANGE_TYPE.ADD,
      value: price,
      isSystem: true,
    });
  });

  it('emits one system change per damage-reduction type', () => {
    const result = buildMaterialChanges(mkInput({
      damageReductionTypes: ['cold-iron', 'silver'],
    }));
    expect(result).toHaveLength(2);
    expect(result.every(c => c.key === 'system.damageReductionTypes')).toBe(true);
    expect(result.map(c => c.value)).toEqual(['cold-iron', 'silver']);
  });

  it('defaults: price/hardness/bonusHp/DR → ADD; magicEquivalency → UPGRADE', () => {
    const result = buildMaterialChanges(mkInput({
      price: { isEmpty: false },
      magicEquivalency: 2,
      hardness: 5,
      bonusHp: 10,
      damageReductionTypes: ['silver'],
    }));
    const byKey = Object.fromEntries(result.map(c => [c.key === 'system.damageReductionTypes' ? 'dr' : c.key, c.type]));
    expect(byKey).toEqual({
      'system.price': EFFECT_CHANGE_TYPE.ADD,
      'system.magicEquivalency': EFFECT_CHANGE_TYPE.UPGRADE,
      'system.hardness': EFFECT_CHANGE_TYPE.ADD,
      'system.hp.max': EFFECT_CHANGE_TYPE.ADD,
      dr: EFFECT_CHANGE_TYPE.ADD,
    });
  });

  it('preserves user-customised change `type` on existing system change for same key', () => {
    const existing = mkSystemChange('system.hardness', EFFECT_CHANGE_TYPE.OVERRIDE);
    const result = buildMaterialChanges(mkInput({
      hardness: 5,
      existingChanges: [existing],
    }));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      key: 'system.hardness',
      type: EFFECT_CHANGE_TYPE.OVERRIDE,
    });
  });

  it('preserves user-customised magicEquivalency type override (ADD instead of UPGRADE)', () => {
    const existing = mkSystemChange('system.magicEquivalency', EFFECT_CHANGE_TYPE.ADD);
    const result = buildMaterialChanges(mkInput({
      magicEquivalency: 3,
      existingChanges: [existing],
    }));
    expect(result[0]?.type).toBe(EFFECT_CHANGE_TYPE.ADD);
  });

  it('tags emitted changes with bonusType derived from materialSubtype: standard → material', () => {
    const result = buildMaterialChanges(mkInput({
      materialSubtype: 'standard',
      hardness: 5,
    }));
    expect(result[0]?.bonusType).toBe(BONUS_TYPE_MATERIAL);
  });

  it('tags emitted changes with bonusType: broken → broken', () => {
    const result = buildMaterialChanges(mkInput({
      materialSubtype: 'broken',
      hardness: -2,
    }));
    expect(result[0]?.bonusType).toBe(BONUS_TYPE_BROKEN);
  });

  it('tags emitted changes with bonusType: masterwork → masterwork', () => {
    const result = buildMaterialChanges(mkInput({
      materialSubtype: 'masterwork',
      magicEquivalency: 1,
    }));
    expect(result[0]?.bonusType).toBe(BONUS_TYPE_MASTERWORK);
  });

  it('emits all changes with isSystem: true and target: ITEM', () => {
    const result = buildMaterialChanges(mkInput({
      hardness: 5,
      bonusHp: 10,
      damageReductionTypes: ['silver'],
    }));
    expect(result.every(c => c.isSystem === true)).toBe(true);
    expect(result.every(c => c.target === EFFECT_CHANGE_TARGET.ITEM)).toBe(true);
    expect(result.every(c => c.phase === 'final')).toBe(true);
  });

  it('user-authored changes come before regenerated system changes in output order', () => {
    const userChange: Dnd35eEffectChangeData = {
      key: 'system.attackBonus',
      type: EFFECT_CHANGE_TYPE.ADD,
      value: 1,
      phase: 'final',
      priority: 20,
      target: EFFECT_CHANGE_TARGET.ITEM,
      effect: null,
      isSystem: false,
      bonusType: BONUS_TYPE_UNTYPED,
    };
    const result = buildMaterialChanges(mkInput({
      hardness: 5,
      existingChanges: [userChange, mkSystemChange('system.hardness', EFFECT_CHANGE_TYPE.ADD)],
    }));
    expect(result[0]).toEqual(userChange);
    expect(result[1]?.key).toBe('system.hardness');
    expect(result[1]?.isSystem).toBe(true);
  });
});
