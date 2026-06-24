import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import type { ActiveEffectDnd35e } from '@effects/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';

type ParentDoc = ItemDnd35e | ActorDnd35e | null;

type Dnd35eDocType = ItemDnd35e | ActorDnd35e | ActiveEffectDnd35e;

export type {
  Dnd35eDocType,
  ParentDoc,
};
