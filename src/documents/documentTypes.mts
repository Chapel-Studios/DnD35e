import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import type { ACTIVE_EFFECTS_DND35E } from '@effects/effectTypes.mjs';
import type { ITEMS_DND35E } from '@items/itemTypes.mjs';

type EffectParent = ACTORS_DND35E | ITEMS_DND35E | null;
type AllDnd35eDocuments = ACTORS_DND35E | ITEMS_DND35E | ACTIVE_EFFECTS_DND35E;

export type {
  AllDnd35eDocuments,
  EffectParent,
};