import type { SelectOption } from '@vc/fields/formGroups/types.mjs';

const MAIN_HAND_EQUIP_SLOT = 'mainHand';
const OFF_HAND_EQUIP_SLOT = 'offHand';

const WEAPON_EQUIP_SLOTS = [
  MAIN_HAND_EQUIP_SLOT,
  OFF_HAND_EQUIP_SLOT,
] as const;

type WeaponEquipSlot = (typeof WEAPON_EQUIP_SLOTS)[number];

const EQUIP_SLOTS = [
  ...WEAPON_EQUIP_SLOTS,
  'head',
  'face',
  'neck',
  'shoulders',
  'chest',
  'torso',
  'belt',
  'wrists',
  'hands',
  'ring-left',
  'ring-right',
  'feet',
] as const;

type EquipSlot = (typeof EQUIP_SLOTS)[number];

// TODO(Phase 6): The 'none' sentinel is a placeholder. An empty selection already means "no slot",
// so this option is redundant for multiselect. If equippedSlotIds becomes a single-select
// nullable field, replace this with value: null and widen the schema type accordingly.
const EQUIP_SLOT_SELECT_OPTIONS: SelectOption<EquipSlot | 'none'>[] = [
  { value: 'none', label: 'dnd35e.COMMON.None' },
  ...EQUIP_SLOTS.map(slot => ({ value: slot, label: `dnd35e.EQUIPPABLE.EquipSlot.${slot}` })),
];

export {
  EQUIP_SLOT_SELECT_OPTIONS,
  EQUIP_SLOTS,
  MAIN_HAND_EQUIP_SLOT,
  OFF_HAND_EQUIP_SLOT,
  WEAPON_EQUIP_SLOTS,
};

export type {
  EquipSlot,
  WeaponEquipSlot,
};
