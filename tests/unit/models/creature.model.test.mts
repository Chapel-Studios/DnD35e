import { CreatureSystemModel } from '@actors/creature/data/CreatureSystemModel.mjs';
import { computeEncumbranceTier, getEncumberedSpeed } from '@constants/carryingCapacity.mjs';
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
  const buildModel = (
    scores: Partial<Record<string, number>>,
    encumbranceOverrides: Partial<CreatureSystemModel['encumbrance']> = {}
  ) => {
    const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
    const model = Object.create(CreatureSystemModel.prototype) as CreatureSystemModel;
    model.size = 'medium';
    model.isQuadruped = false;
    // Set up abilities with provided scores (default 10)
    model.abilities = Object.fromEntries(
      ABILITY_KEYS.map((key) => [key, { score: scores[key] ?? 10, mod: 0 }])
    ) as CreatureSystemModel['abilities'];
    model.speed = {
      land: 30,
      climb: 0,
      swim: 0,
      burrow: 0,
      fly: 0,
      flyManeuverability: null,
    } as CreatureSystemModel['speed'];
    // ActorSystemModel.prepareDerivedData() resets the live speed values from
    // `_source` each pass; mock it here since this test bypasses the real constructor.
    (model as unknown as { _source: unknown })._source = { speed: model.speed };
    model.encumbrance = {
      carriedWeight: 0,
      light: 0,
      medium: 0,
      heavy: 0,
      maxLift: 0,
      drag: 0,
      tier: 0,
      carryBonus: 0,
      carryMultiplier: 1,
      ...encumbranceOverrides,
    } as CreatureSystemModel['encumbrance'];
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

describe('CreatureSystemModel encumbrance', () => {
  const buildModel = (
    scores: Partial<Record<string, number>>,
    encumbranceOverrides: Partial<CreatureSystemModel['encumbrance']> = {}
  ) => {
    const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
    const model = Object.create(CreatureSystemModel.prototype) as CreatureSystemModel;
    model.size = 'medium';
    model.isQuadruped = false;
    model.abilities = Object.fromEntries(
      ABILITY_KEYS.map((key) => [key, { score: scores[key] ?? 10, mod: 0 }])
    ) as CreatureSystemModel['abilities'];
    model.speed = {
      land: 30,
      climb: 0,
      swim: 0,
      burrow: 0,
      fly: 0,
      flyManeuverability: null,
    } as CreatureSystemModel['speed'];
    // ActorSystemModel.prepareDerivedData() resets the live speed values from
    // `_source` each pass; mock it here since this test bypasses the real constructor.
    (model as unknown as { _source: unknown })._source = { speed: model.speed };
    model.encumbrance = {
      carriedWeight: 0,
      light: 0,
      medium: 0,
      heavy: 0,
      maxLift: 0,
      drag: 0,
      tier: 0,
      carryBonus: 0,
      carryMultiplier: 1,
      ...encumbranceOverrides,
    } as CreatureSystemModel['encumbrance'];
    model.prepareDerivedData();
    return model;
  };

  it('derives light/medium/heavy thresholds from the SRD carrying capacity table for str 10', () => {
    const model = buildModel({ str: 10 });
    expect(model.encumbrance.light).toBe(33);
    expect(model.encumbrance.medium).toBe(66);
    expect(model.encumbrance.heavy).toBe(100);
  });

  it('sets maxLift to 2x heavy, and drag to 5x heavy', () => {
    const model = buildModel({ str: 10 });
    expect(model.encumbrance.maxLift).toBe(model.encumbrance.heavy * 2);
    expect(model.encumbrance.drag).toBe(model.encumbrance.heavy * 5);
  });

  it('adds carryBonus to the base Strength score before threshold lookup', () => {
    const withBonus = buildModel({ str: 8 }, { carryBonus: 2 });
    const withoutBonus = buildModel({ str: 10 });
    expect(withBonus.encumbrance.light).toBe(withoutBonus.encumbrance.light);
    expect(withBonus.encumbrance.heavy).toBe(withoutBonus.encumbrance.heavy);
  });

  it('scales thresholds by carryMultiplier and floors the result', () => {
    const model = buildModel({ str: 10 }, { carryMultiplier: 1.5 });
    // base str 10 -> light 33, medium 66, heavy 100
    expect(model.encumbrance.light).toBe(Math.floor(33 * 1.5));
    expect(model.encumbrance.medium).toBe(Math.floor(66 * 1.5));
    expect(model.encumbrance.heavy).toBe(Math.floor(100 * 1.5));
  });

  it('sets tier during prepareDerivedData based on carriedWeight', () => {
    const model = buildModel({ str: 10 }, { carriedWeight: 101 });
    // base str 10 -> light 33, medium 66, heavy 100 -> 101 is over heavy -> tier 3
    expect(model.encumbrance.tier).toBe(3);
  });

  it('recomputes tier every pass rather than reusing a stale value', () => {
    const model = buildModel({ str: 10 }, { carriedWeight: 10, tier: 3 });
    // 10 is under light (33) -> tier should reset to 0, not stay at the stale override
    expect(model.encumbrance.tier).toBe(0);
  });

  describe('str 10 tier progression (light=33, medium=66, heavy=100, maxLift=200, drag=500)', () => {
    it.each([
      [0,   0], // no weight -> light
      [33,  0], // at light threshold -> still light
      [34,  1], // just over light -> medium
      [66,  1], // at medium threshold -> still medium
      [67,  2], // just over medium -> heavy
      [100, 2], // at heavy threshold -> still heavy
      [101, 3], // just over heavy -> max lift
      [200, 3], // at maxLift (heavy*2) threshold -> still max lift
      [201, 4], // just over maxLift -> drag
      [500, 4], // at drag (heavy*5) threshold -> still drag
      [501, 5], // beyond drag -> immobile
    ])('carriedWeight %i lbs -> tier %i', (carriedWeight, expectedTier) => {
      const model = buildModel({ str: 10 }, { carriedWeight });
      expect(model.encumbrance.tier).toBe(expectedTier);
    });
  });
});

describe('computeEncumbranceTier', () => {
  it.each([
    [0,   0], // at/under light -> tier 0
    [33,  0], // exactly at light threshold -> tier 0
    [34,  1], // just over light -> tier 1
    [66,  1], // exactly at medium threshold -> tier 1
    [67,  2], // just over medium -> tier 2
    [100, 2], // exactly at heavy threshold -> tier 2
    [101, 3], // over heavy -> tier 3 (overloaded)
  ])('carriedWeight %i lbs (light=33, medium=66, heavy=100) -> tier %i', (carriedWeight, expectedTier) => {
    expect(computeEncumbranceTier(carriedWeight, 33, 66, 100)).toBe(expectedTier);
  });

  it('reflects a freshly-updated carriedWeight regardless of previously-computed thresholds', () => {
    // Simulates the scenario the fix targets: carriedWeight changes (e.g. via a
    // final-phase carried-item AE) after light/medium/heavy were last computed.
    // computeEncumbranceTier has no stored/stale state - it always reflects
    // whatever carriedWeight is passed in.
    expect(computeEncumbranceTier(5, 33, 66, 100)).toBe(0);
    expect(computeEncumbranceTier(37.2, 33, 66, 100)).toBe(1);
  });
});

describe('getEncumberedSpeed', () => {
  it.each([
    [0, 6], // light -> full speed
    [1, 4], // medium -> reduced speed (base 6 squares/30 ft -> 4 squares/20 ft per SRD table)
    [2, 4], // heavy -> same reduced speed as medium
    [3, 1], // max lift -> 1-square (5-foot) stagger
    [4, 1], // drag -> 1-square (5-foot) stagger
    [5, 0], // beyond drag -> immobile
  ])('base speed 6 squares (30 ft), tier %i -> speed %i', (tier, expectedSpeed) => {
    expect(getEncumberedSpeed(6, tier)).toBe(expectedSpeed);
  });

  it('returns full speed unchanged for light load regardless of base speed', () => {
    expect(getEncumberedSpeed(8, 0)).toBe(8);
  });
});

describe('CreatureSystemModel AC/saves/init/BAB baseline derivation', () => {
  const buildModel = (
    scores: Partial<Record<string, number>>,
    encumbranceOverrides: Partial<CreatureSystemModel['encumbrance']> = {}
  ) => {
    const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
    const model = Object.create(CreatureSystemModel.prototype) as CreatureSystemModel;
    model.size = 'medium';
    model.isQuadruped = false;
    model.abilities = Object.fromEntries(
      ABILITY_KEYS.map((key) => [key, { score: scores[key] ?? 10, mod: 0 }])
    ) as CreatureSystemModel['abilities'];
    model.speed = {
      land: 30,
      climb: 0,
      swim: 0,
      burrow: 0,
      fly: 0,
      flyManeuverability: null,
    } as CreatureSystemModel['speed'];
    (model as unknown as { _source: unknown })._source = { speed: model.speed };
    model.encumbrance = {
      carriedWeight: 0,
      light: 0,
      medium: 0,
      heavy: 0,
      maxLift: 0,
      drag: 0,
      tier: 0,
      carryBonus: 0,
      carryMultiplier: 1,
      ...encumbranceOverrides,
    } as CreatureSystemModel['encumbrance'];
    // Initialize baseline defense/saves/init/bab fields
    model.defense = {
      armorClass: 0,
      touchAC: 0,
      denyDexToAC: false,
      armorBonus: 0,
      shieldBonus: 0,
      naturalArmor: 0,
      fortification: 0,
      concealment: 0,
      spellResistance: { formula: '', expectedType: 'number', resolvedValue: '0' },
    } as any;
    model.saves = {
      fort: 0,
      reflex: 0,
      will: 0,
    } as any;
    model.init = 0 as any;
    model.bab = { total: 0 } as any;
    model.prepareDerivedData();
    return model;
  };

  it('baseline saves all default to 0 (no modifiers applied)', () => {
    const model = buildModel({});
    expect(model.saves.fort).toBe(0);
    expect(model.saves.reflex).toBe(0);
    expect(model.saves.will).toBe(0);
  });

  it('baseline initiative defaults to 0 (no DEX adjustment)', () => {
    const model = buildModel({});
    expect(model.init).toBe(0);
  });

  it('baseline BAB defaults to 0', () => {
    const model = buildModel({});
    expect(model.bab.total).toBe(0);
  });

  describe('ability modifiers are correctly derived as floor((score - 10) / 2)', () => {
    it.each([
      [1,  -5],
      [2,  -4],
      [3,  -4],
      [8,  -1],
      [9,  -1],
      [10,  0],
      [11,  0],
      [12,  1],
      [13,  1],
      [18,  4],
      [19,  4],
      [20,  5],
    ])('score %i -> mod %i', (score, expectedMod) => {
      const model = buildModel({ str: score });
      expect(model.abilities.str.mod).toBe(expectedMod);
    });
  });

  it('all six abilities are derived during prepareDerivedData', () => {
    const model = buildModel({
      str: 11,
      dex: 14,
      con: 13,
      int: 12,
      wis: 16,
      cha: 9,
    });
    expect(model.abilities.str.mod).toBe(0);
    expect(model.abilities.dex.mod).toBe(2);
    expect(model.abilities.con.mod).toBe(1);
    expect(model.abilities.int.mod).toBe(1);
    expect(model.abilities.wis.mod).toBe(3);
    expect(model.abilities.cha.mod).toBe(-1);
  });

  it('ability mods are recomputed fresh on every prepareDerivedData pass', () => {
    const model = Object.create(CreatureSystemModel.prototype) as CreatureSystemModel;
    model.size = 'medium';
    model.isQuadruped = false;
    model.abilities = {
      str: { score: 10, mod: 999 }, // stale value
      dex: { score: 10, mod: 999 },
      con: { score: 10, mod: 999 },
      int: { score: 10, mod: 999 },
      wis: { score: 10, mod: 999 },
      cha: { score: 10, mod: 999 },
    } as any;
    model.speed = {
      land: 30,
      climb: 0,
      swim: 0,
      burrow: 0,
      fly: 0,
      flyManeuverability: null,
    } as any;
    (model as unknown as { _source: unknown })._source = { speed: model.speed };
    model.encumbrance = {
      carriedWeight: 0,
      light: 0,
      medium: 0,
      heavy: 0,
      maxLift: 0,
      drag: 0,
      tier: 0,
      carryBonus: 0,
      carryMultiplier: 1,
    } as any;
    model.defense = { armorClass: 10 } as any;
    model.saves = { fort: { total: 0 }, ref: { total: 0 }, will: { total: 0 } } as any;
    model.init = 0 as any;
    model.bab = { total: 0 } as any;

    // First pass
    model.prepareDerivedData();
    expect(model.abilities.str.mod).toBe(0);

    // Simulate ability score change
    model.abilities.str.score = 14;

    // Second pass
    model.prepareDerivedData();
    expect(model.abilities.str.mod).toBe(2); // 14 is +2, not the stale 999
  });
});


