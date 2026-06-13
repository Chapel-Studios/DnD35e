import type { SelectOption } from '@vc/fields/index.mjs';

const LAND = 'land';
const CLIMB = 'climb';
const SWIM = 'swim';
const FLY = 'fly';
const BURROW = 'burrow';
const SPEED_TYPES = [LAND, CLIMB, SWIM, FLY, BURROW] as const;
const SPEED_TYPE = {
  LAND,
  CLIMB,
  SWIM,
  FLY,
  BURROW,
} as const;
type SpeedType = (typeof SPEED_TYPES)[number];

const SPEED_KEYS_LOCALIZED = {
  [LAND]: 'dnd35e.ACTOR.FIELDS.speed.land.label',
  [CLIMB]: 'dnd35e.ACTOR.FIELDS.speed.climb.label',
  [SWIM]: 'dnd35e.ACTOR.FIELDS.speed.swim.label',
  [FLY]: 'dnd35e.ACTOR.FIELDS.speed.fly.label',
  [BURROW]: 'dnd35e.ACTOR.FIELDS.speed.burrow.label',
} as const satisfies Record<SpeedType, string>;

const CLUMSY = 'clumsy';
const POOR = 'poor';
const AVERAGE = 'average';
const GOOD = 'good';
const PERFECT = 'perfect';

const FLY_MANEUVERABILITIES = [
  CLUMSY,
  POOR,
  AVERAGE,
  GOOD,
  PERFECT,
] as const;
type FlyManeuverability = (typeof FLY_MANEUVERABILITIES)[number];
const FLY_MANEUVERABILITY = {
  CLUMSY,
  POOR,
  AVERAGE,
  GOOD,
  PERFECT,
} as const;

const FLY_MANEUVERABILITY_LOCALIZED = {
  [CLUMSY]: 'dnd35e.ACTOR.flyManeuverability.clumsy',
  [POOR]: 'dnd35e.ACTOR.flyManeuverability.poor',
  [AVERAGE]: 'dnd35e.ACTOR.flyManeuverability.average',
  [GOOD]: 'dnd35e.ACTOR.flyManeuverability.good',
  [PERFECT]: 'dnd35e.ACTOR.flyManeuverability.perfect',
} as const satisfies Record<FlyManeuverability, string>;

const FLY_MANEUVERABILITY_OPTIONS: SelectOption<FlyManeuverability>[] = FLY_MANEUVERABILITIES.map(value => ({
  value,
  label: FLY_MANEUVERABILITY_LOCALIZED[value],
}));

export {
  FLY_MANEUVERABILITIES,
  FLY_MANEUVERABILITY,
  FLY_MANEUVERABILITY_LOCALIZED,
  FLY_MANEUVERABILITY_OPTIONS,
  SPEED_KEYS_LOCALIZED,
  SPEED_TYPE,
  SPEED_TYPES,
};

export type {
  FlyManeuverability,
  SpeedType,
};
