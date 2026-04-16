import type { MultiSelectOption } from '@vc/Fields/FormGroups/types.mjs';

const EQUIP_SLOTS = [
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
const EQUIP_SLOT_SELECT_OPTIONS: MultiSelectOption<EquipSlot | 'none'>[] = [
  { value: 'none', label: game.i18n.localize('dnd35e.COMMON.None') },
  ...EQUIP_SLOTS.map(slot => ({ value: slot, label: game.i18n.localize(`dnd35e.EQUIPPABLE.EquipSlot.${slot}`) })),
];

export {
  EQUIP_SLOT_SELECT_OPTIONS,
  EQUIP_SLOTS,
};

export type {
  EquipSlot,
};
