const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
type AbilityKey = (typeof ABILITY_KEYS)[number];

const ABILITY_KEYS_LOCALIZED = {
  str: 'dnd35e.ABILITY.str',
  dex: 'dnd35e.ABILITY.dex',
  con: 'dnd35e.ABILITY.con',
  int: 'dnd35e.ABILITY.int',
  wis: 'dnd35e.ABILITY.wis',
  cha: 'dnd35e.ABILITY.cha',
} as const satisfies Record<AbilityKey, string>;

export {
  ABILITY_KEYS,
  ABILITY_KEYS_LOCALIZED,
};

export type {
  AbilityKey,
};
