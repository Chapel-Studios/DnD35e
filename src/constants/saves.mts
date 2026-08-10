import type { AbilityKey } from '@constants/abilities.mjs';
import { CON, DEX, WIS } from '@constants/abilities.mjs';

const FORT = 'fort';
const REFLEX = 'reflex';
const WILL = 'will';
const SAVE_KEYS = [FORT, REFLEX, WILL] as const;
type SaveKey = (typeof SAVE_KEYS)[number];

const SAVE_KEYS_LOCALIZED = {
  [FORT]: 'dnd35e.ROLL.SaveNames.fort',
  [REFLEX]: 'dnd35e.ROLL.SaveNames.reflex',
  [WILL]: 'dnd35e.ROLL.SaveNames.will',
} as const satisfies Record<SaveKey, string>;

/** SRD default ability governing each save; no per-save override field exists yet. */
const SAVE_ABILITY_MAP = {
  [FORT]: CON,
  [REFLEX]: DEX,
  [WILL]: WIS,
} as const satisfies Record<SaveKey, AbilityKey>;

export {
  FORT,
  REFLEX,
  SAVE_ABILITY_MAP,
  SAVE_KEYS,
  SAVE_KEYS_LOCALIZED,
  WILL,
};

export type {
  SaveKey,
};
