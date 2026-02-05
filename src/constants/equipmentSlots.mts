export const EQUIP_SLOTS = [
  "head",
  "face",
  "neck",
  "shoulders",
  "chest",
  "torso",
  "belt",
  "wrists",
  "hands",
  "ring-left",
  "ring-right",
  "feet"
] as const;

export type EquipSlot = (typeof EQUIP_SLOTS)[number];

export const EQUIP_SLOT_SELECT_OPTIONS: { value: EquipSlot | null; label: string }[] = [
  { value: null, label: game.i18n.localize('D35E.None') },
  ...EQUIP_SLOTS.map(slot => ({ value: slot, label: game.i18n.localize(`D35E.EquipSlot.${slot}`) })),
];
