import type { SelectOption } from '@vc/fields/index.mjs';

const DAMAGE_ADJUSTMENT = 'damage';
const HEALING_ADJUSTMENT = 'healing';
const TEMPORARY_ADJUSTMENT = 'temporary';
const NONLETHAL_ADJUSTMENT = 'nonlethal';

const HP_ADJUSTMENT_TYPES = [
  NONLETHAL_ADJUSTMENT,
  DAMAGE_ADJUSTMENT,
  HEALING_ADJUSTMENT,
  TEMPORARY_ADJUSTMENT,
] as const;

const HP_ADJUSTMENT_TYPE = {
  DAMAGE_ADJUSTMENT,
  HEALING_ADJUSTMENT,
  TEMPORARY_ADJUSTMENT,
  NONLETHAL_ADJUSTMENT,
} as const;

type HpAdjustmentType = (typeof HP_ADJUSTMENT_TYPES)[number];

const HP_ADJUSTMENT_TYPE_LOCALIZED = {
  [DAMAGE_ADJUSTMENT]: 'dnd35e.CREATURE.FIELDS.hp.adjustment.damage.label',
  [HEALING_ADJUSTMENT]: 'dnd35e.CREATURE.FIELDS.hp.adjustment.healing.label',
  [TEMPORARY_ADJUSTMENT]: 'dnd35e.CREATURE.FIELDS.hp.adjustment.temp.label',
  [NONLETHAL_ADJUSTMENT]: 'dnd35e.CREATURE.FIELDS.hp.adjustment.nonlethal.label',
} as const satisfies Record<HpAdjustmentType, string>;

const HP_ADJUSTMENT_TYPE_OPTIONS: SelectOption<HpAdjustmentType>[] = HP_ADJUSTMENT_TYPES.map(value => ({
  value,
  label: HP_ADJUSTMENT_TYPE_LOCALIZED[value],
}));

const HP_ADJUSTMENT_TYPE_ICON = {
  [DAMAGE_ADJUSTMENT]: 'fa-solid fa-heart-crack',
  [HEALING_ADJUSTMENT]: 'fa-solid fa-heart-pulse',
  [TEMPORARY_ADJUSTMENT]: 'fa-solid fa-shield',
  [NONLETHAL_ADJUSTMENT]: 'fa-solid fa-moon',
} as const satisfies Record<HpAdjustmentType, string>;

// Icon-only variant of HP_ADJUSTMENT_TYPE_OPTIONS — label is kept for the tooltip (see MultiOptionToggle's iconOnly prop).
const HP_ADJUSTMENT_TYPE_ICON_OPTIONS: SelectOption<HpAdjustmentType>[] = HP_ADJUSTMENT_TYPES.map(value => ({
  value,
  label: HP_ADJUSTMENT_TYPE_LOCALIZED[value],
  icon: HP_ADJUSTMENT_TYPE_ICON[value],
}));

export type {
  HpAdjustmentType,
};

export {
  HP_ADJUSTMENT_TYPE,
  HP_ADJUSTMENT_TYPE_ICON,
  HP_ADJUSTMENT_TYPE_ICON_OPTIONS,
  HP_ADJUSTMENT_TYPE_LOCALIZED,
  HP_ADJUSTMENT_TYPE_OPTIONS,
  HP_ADJUSTMENT_TYPES,
};