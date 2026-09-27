import type { SelectOption } from '@vc/fields/formGroups/types.mjs';

const MAIN_HAND_EQUIP_SLOT = 'mainHand';
const OFF_HAND_EQUIP_SLOT = 'offHand';
const BOTH_HANDS_EQUIP_SLOT = 'bothHands';

const WEAPON_EQUIP_SLOTS = [
  MAIN_HAND_EQUIP_SLOT,
  OFF_HAND_EQUIP_SLOT,
] as const;

type WeaponEquipSlot = (typeof WEAPON_EQUIP_SLOTS)[number];

/**
 * Which hand(s) an attack draws BAB/STR-scaling from (poc.10 §10.3) — the single shared
 * vocabulary for wield-mode detection, BAB-pool bookkeeping, TWF penalties, and the Attack
 * Roll Dialog's overrides. Never re-encode this as a differently-named 3-state string.
 */
type WieldedHand = typeof MAIN_HAND_EQUIP_SLOT
  | typeof OFF_HAND_EQUIP_SLOT
  | typeof BOTH_HANDS_EQUIP_SLOT;

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

// TODO: The 'none' sentinel is a placeholder. An empty selection already means "no slot",
// so this option is redundant for multiselect. If equippedSlotIds becomes a single-select
// nullable field, replace this with value: null and widen the schema type accordingly.
const EQUIP_SLOT_SELECT_OPTIONS: SelectOption<EquipSlot | 'none'>[] = [
  { value: 'none', label: 'dnd35e.COMMON.None' },
  ...EQUIP_SLOTS.map(slot => ({ value: slot, label: `dnd35e.EQUIPPABLE.EquipSlot.${slot}` })),
];

export {
  BOTH_HANDS_EQUIP_SLOT,
  EQUIP_SLOT_SELECT_OPTIONS,
  EQUIP_SLOTS,
  MAIN_HAND_EQUIP_SLOT,
  OFF_HAND_EQUIP_SLOT,
  WEAPON_EQUIP_SLOTS,
};

export type {
  EquipSlot,
  WeaponEquipSlot,
  WieldedHand,
};
