const STR = 'str';
const DEX = 'dex';
const CON = 'con';
const INT = 'int';
const WIS = 'wis';
const CHA = 'cha';
const ABILITY_KEYS = [STR, DEX, CON, INT, WIS, CHA] as const;
type AbilityKey = (typeof ABILITY_KEYS)[number];

const ABILITY_KEYS_LOCALIZED = {
  [STR]: 'dnd35e.ABILITY.str',
  [DEX]: 'dnd35e.ABILITY.dex',
  [CON]: 'dnd35e.ABILITY.con',
  [INT]: 'dnd35e.ABILITY.int',
  [WIS]: 'dnd35e.ABILITY.wis',
  [CHA]: 'dnd35e.ABILITY.cha',
} as const satisfies Record<AbilityKey, string>;

export {
  ABILITY_KEYS,
  ABILITY_KEYS_LOCALIZED,
  CHA,
  CON,
  DEX,
  INT,
  STR,
  WIS,
};

export type {
  AbilityKey,
};
