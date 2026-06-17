import type { SelectOption } from '@vc/fields/index.mjs';

const DARKVISION = 'darkvision';
const LOW_LIGHT_VISION = 'lowLight';
const TREMORSENSE = 'tremorsense';
const BLINDSIGHT = 'blindsight';
const SCENT = 'scent';
const TRAP_SENSE = 'trapSense';

const SENSE_TYPES = [
  DARKVISION,
  LOW_LIGHT_VISION,
  TREMORSENSE,
  BLINDSIGHT,
  SCENT,
  TRAP_SENSE,
] as const;
type SenseType = (typeof SENSE_TYPES)[number];

const SENSE_TYPE = {
  DARKVISION,
  LOW_LIGHT_VISION,
  TREMORSENSE,
  BLINDSIGHT,
  SCENT,
  TRAP_SENSE,
} as const;

const SENSE_TYPES_LOCALIZED = {
  [DARKVISION]: 'dnd35e.ACTOR.sense.darkvision',
  [LOW_LIGHT_VISION]: 'dnd35e.ACTOR.sense.lowLight',
  [TREMORSENSE]: 'dnd35e.ACTOR.sense.tremorsense',
  [BLINDSIGHT]: 'dnd35e.ACTOR.sense.blindsight',
  [SCENT]: 'dnd35e.ACTOR.sense.scent',
  [TRAP_SENSE]: 'dnd35e.ACTOR.sense.trapSense',
} as const satisfies Record<SenseType, string>;

const SENSE_TYPES_OPTIONS: SelectOption<SenseType>[] = SENSE_TYPES.map(value => ({
  value,
  label: SENSE_TYPES_LOCALIZED[value],
}));

export {
  BLINDSIGHT,
  DARKVISION,
  LOW_LIGHT_VISION,
  SCENT,
  SENSE_TYPE,
  SENSE_TYPES,
  SENSE_TYPES_LOCALIZED,
  SENSE_TYPES_OPTIONS,
  TRAP_SENSE,
  TREMORSENSE,
};

export type { SenseType };
