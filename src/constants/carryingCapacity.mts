import type { Size } from './sizes.mjs';

/**
 * SRD Table: Carrying Capacity (Str 1-29 -> light/medium/heavy max load in lb).
 * Source: https://www.d20srd.org/srd/carryingCapacity.htm
 * Index 0 is unused (Str scores start at 1); index N holds the row for Str N.
 */
const CARRYING_CAPACITY_TABLE: ReadonlyArray<readonly [light: number, medium: number, heavy: number]> = [
  [0, 0, 0],       // Str 0 (unused placeholder - see getCarryingCapacity for Str <= 0 handling)
  [3, 6, 10],       // Str 1
  [6, 13, 20],       // Str 2
  [10, 20, 30],       // Str 3
  [13, 26, 40],       // Str 4
  [16, 33, 50],       // Str 5
  [20, 40, 60],       // Str 6
  [23, 46, 70],       // Str 7
  [26, 53, 80],       // Str 8
  [30, 60, 90],       // Str 9
  [33, 66, 100],      // Str 10
  [38, 76, 115],      // Str 11
  [43, 86, 130],      // Str 12
  [50, 100, 150],     // Str 13
  [58, 116, 175],     // Str 14
  [66, 133, 200],     // Str 15
  [76, 153, 230],     // Str 16
  [86, 173, 260],     // Str 17
  [100, 200, 300],    // Str 18
  [116, 233, 350],    // Str 19
  [133, 266, 400],    // Str 20
  [153, 306, 460],    // Str 21
  [173, 346, 520],    // Str 22
  [200, 400, 600],    // Str 23
  [233, 466, 700],    // Str 24
  [266, 533, 800],    // Str 25
  [306, 613, 920],    // Str 26
  [346, 693, 1040],   // Str 27
  [400, 800, 1200],   // Str 28
  [466, 933, 1400],   // Str 29
];

const STANDARD_SIZE_CARRYING_CAPACITY_MULTIPLIERS: Record<Size, number> = {
  fine: 0.125,
  diminutive: 0.25,
  tiny: 0.5,
  small: 0.75,
  medium: 1,
  large: 2,
  huge: 4,
  gargantuan: 8,
  colossal: 16,
};
const QUADRUPED_SIZE_CARRYING_CAPACITY_MULTIPLIERS: Record<Size, number> = {
  fine: 0.25,
  diminutive: 0.5,
  tiny: 0.75,
  small: 1,
  medium: 1.5,
  large: 3,
  huge: 6,
  gargantuan: 12,
  colossal: 24,
};

interface CarryingCapacity {
  light: number;
  medium: number;
  heavy: number;
}

/**
 * Pure function computing which carrying-capacity tier a given carried weight
 * falls into (0=light, 1=medium, 2=heavy, 3=maxLift, 4=overloaded/drag, 5=beyond drag limit).
 *
 * Extracted so it can be exercised without constructing a `Creature` document
 * or its Foundry Actor base class. Called from `CreatureSystemModel._prepareEncumbrance()`
 * during `prepareDerivedData()` - `carriedWeight` is already settled by then since
 * carried-item AE changes apply in the 'initial' phase (see
 * `PhysicalItem._buildCarriedChanges()`).
 */
const computeEncumbranceTier = (
  carriedWeight: number,
  light: number,
  medium: number,
  heavy: number
): number => {
  if (carriedWeight <= light) return 0;
  if (carriedWeight <= medium) return 1;
  if (carriedWeight <= heavy) return 2;
  if (carriedWeight <= heavy * 2) return 3; // max lift / stumble around only
  if (carriedWeight <= heavy * 5) return 4; // overloaded - can only drag/push (matches `drag` = heavy * 5)
  return 5; // beyond drag limit - cannot move at all
};

/**
 * Resolve base (unmultiplied) carrying capacity for a given effective Strength score,
 * per SRD Table: Carrying Capacity and the "Tremendous Strength" extrapolation rule
 * (Str scores above 29: find the row between 20-29 with the same ones digit, then
 * multiply that row's values by 4 for every full 10 points above that row).
 *
 * @param strengthScore - Effective Strength score (base score + any carryBonus already applied).
 * @param creatureSize - Creature size (affects carrying capacity via size multipliers).
 * @param isQuadruped - Whether the creature is a quadruped (affects carrying capacity via size multipliers).
 * @returns CarryingCapacity object with light, medium, and heavy max load values in pounds.
 */
const getCarryingCapacity = (
  strengthScore: number,
  creatureSize: Size,
  isQuadruped: boolean
): CarryingCapacity => {
  const str = Math.floor(strengthScore);
  const multiplyScoreByBody = (capacity: CarryingCapacity): CarryingCapacity => {
    const multiplier = isQuadruped
      ? QUADRUPED_SIZE_CARRYING_CAPACITY_MULTIPLIERS[creatureSize]
      : STANDARD_SIZE_CARRYING_CAPACITY_MULTIPLIERS[creatureSize];
    return {
      light: capacity.light * multiplier,
      medium: capacity.medium * multiplier,
      heavy: capacity.heavy * multiplier,
    };
  };

  if (str <= 0) return { light: 0, medium: 0, heavy: 0 };

  if (str <= 29) {
    const [light, medium, heavy] = CARRYING_CAPACITY_TABLE[str];
    return multiplyScoreByBody({ light, medium, heavy });
  }

  const row = 20 + (str % 10);
  const tensAbove = Math.floor((str - row) / 10);
  const multiplier = 4 ** tensAbove;
  const [light, medium, heavy] = CARRYING_CAPACITY_TABLE[row];
  return multiplyScoreByBody({
    light: light * multiplier,
    medium: medium * multiplier,
    heavy: heavy * multiplier,
  });
};

const ENCUMBERED_SPEED: Record<number, number> = {
  20: 15,
  30: 20,
  40: 30,
  50: 35,
  60: 40,
  70: 50,
  80: 55,
  90: 60,
  100: 70,
};

/**
 * Compute the encumbered speed for a creature based on its base speed and encumbrance tier.
 *
 * Tiers 1-2 (medium/heavy) use the SRD encumbered-speed table (same reduced value for both,
 * per SRD rules). Tiers 3-4 (max lift / drag) reduce movement to a 5-foot stagger. Tier 5
 * (beyond the drag limit) means the creature cannot move at all.
 *
 * @param baseSpeed - The base speed of the creature (in feet per round).
 * @param encumbranceTier - The encumbrance tier (0=light, 1=medium, 2=heavy, 3=maxLift, 4=drag, 5=beyond drag).
 * @returns The encumbered speed (in feet per round).
 */
const getEncumberedSpeed = (baseSpeed: number, encumbranceTier: number): number => {
  if (encumbranceTier <= 0) return baseSpeed;
  if (encumbranceTier >= 5) return 0;
  if (encumbranceTier >= 3) return 5;

  const speedThreshold = Math.floor(baseSpeed / 10) * 10;
  return ENCUMBERED_SPEED[speedThreshold] ?? baseSpeed;
};

export {
  computeEncumbranceTier,
  getCarryingCapacity,
  getEncumberedSpeed,
};

export type {
  CarryingCapacity,
};
