import { CreatureSystemModel } from '@actors/creature/data/CreatureSystemModel.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Unit tests for CreatureSystemModel.prepareDerivedData() ability modifier formula.
 *
 * Formula: mod = floor((score - 10) / 2)
 *
 * Uses Object.create to bypass the abstract constructor and invoke
 * prepareDerivedData() directly with pre-set ability data.
 */

describe('CreatureSystemModel ability modifier', () => {
  const buildModel = (scores: Partial<Record<string, number>>) => {
    const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
    const model = Object.create(CreatureSystemModel.prototype) as CreatureSystemModel;
    // Set up abilities with provided scores (default 10)
    model.abilities = Object.fromEntries(
      ABILITY_KEYS.map((key) => [key, { score: scores[key] ?? 10, mod: 0 }])
    ) as CreatureSystemModel['abilities'];
    model.speed = {
      land: { base: 30, total: 0 },
      climb: { base: 0, total: 0 },
      swim: { base: 0, total: 0 },
      burrow: { base: 0, total: 0 },
      fly: { base: 0, total: 0 },
      flyManeuverability: null,
    } as CreatureSystemModel['speed'];
    model.prepareDerivedData();
    return model;
  };

  describe('edge cases from spec', () => {
    it('score 1  → modifier −5', () => {
      expect(buildModel({ str: 1 }).abilities.str.mod).toBe(-5);
    });

    it('score 20 → modifier +5', () => {
      expect(buildModel({ str: 20 }).abilities.str.mod).toBe(5);
    });
  });

  describe('standard D&D 3.5e reference values', () => {
    it.each([
      [1,  -5],
      [2,  -4],
      [8,  -1],
      [9,  -1],
      [10,  0],
      [11,  0],
      [12,  1],
      [13,  1],
      [14,  2],
      [18,  4],
      [20,  5],
    ])('score %i → modifier %i', (score, expected) => {
      expect(buildModel({ str: score }).abilities.str.mod).toBe(expected);
    });
  });

  it('computes mods for all six abilities independently', () => {
    const model = buildModel({ str: 14, dex: 12, con: 10, int: 8, wis: 13, cha: 18 });
    expect(model.abilities.str.mod).toBe(2);
    expect(model.abilities.dex.mod).toBe(1);
    expect(model.abilities.con.mod).toBe(0);
    expect(model.abilities.int.mod).toBe(-1);
    expect(model.abilities.wis.mod).toBe(1);
    expect(model.abilities.cha.mod).toBe(4);
  });
});
