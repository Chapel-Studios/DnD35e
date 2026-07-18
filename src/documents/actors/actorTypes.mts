import type { Character } from './character/Character.mjs';

// TODO(Phase 6 → Phase 23): remove placeholder. Phase 6 verifies character-only scope; Phase 23 adds NPC/Trap/Object.
const characterActorType = 'character';
type CharacterActorType = typeof characterActorType;

const CREATURE_ACTOR_TYPES = new Set([
  characterActorType,
] as const);
type CreatureActorType = SetElement<typeof CREATURE_ACTOR_TYPES>;
type CREATURE_ACTORS = Character;


const ACTOR_TYPES = new Set([
  ...CREATURE_ACTOR_TYPES,
] as const);
type ActorType = SetElement<typeof ACTOR_TYPES>;
type ACTORS_DND35E = CREATURE_ACTORS;


const ACTOR_TYPES_LOCALIZED = {
  character: 'TYPES.Actor.character',
} as const satisfies Record<ActorType, string>;
type ActorTypeLocalizationValues = typeof ACTOR_TYPES_LOCALIZED[keyof typeof ACTOR_TYPES_LOCALIZED];

export {
  ACTOR_TYPES,
  ACTOR_TYPES_LOCALIZED,
  characterActorType,
  CREATURE_ACTOR_TYPES,
};

export type {
  ACTORS_DND35E,
  ActorType,
  ActorTypeLocalizationValues,
  CharacterActorType,
  CREATURE_ACTORS,
  CreatureActorType,
};
