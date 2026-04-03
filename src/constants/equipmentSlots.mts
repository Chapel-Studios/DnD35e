import { MultiSelectOption } from '@vc/Fields/FormGroups/types.mjs';

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

const EQUIP_SLOT_SELECT_OPTIONS: MultiSelectOption[] = [
  { value: 'none', label: game.i18n.localize('D35E.None') },
  ...EQUIP_SLOTS.map(slot => ({ value: slot, label: game.i18n.localize(`D35E.EquipSlot.${slot}`) })),
];

export {
  EQUIP_SLOT_SELECT_OPTIONS,
  EQUIP_SLOTS,
};

export type {
  EquipSlot,
};
