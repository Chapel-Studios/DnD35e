// TODO(Phase 6 → Phase 23): remove placeholder. Phase 6 verifies character-only scope; Phase 23 adds NPC/Trap/Object.
const characterActorType = 'character';
type CharacterActorType = typeof characterActorType;// | 'npc' | 'trap'; 

const ACTOR_TYPES = new Set([
  characterActorType,
] as const);
type ActorType = SetElement<typeof ACTOR_TYPES>;


const ACTOR_TYPES_LOCALIZED = {
  character: 'TYPES.Actor.character',
} as const satisfies Record<ActorType, string>;
type ActorTypeLocalizationValues = typeof ACTOR_TYPES_LOCALIZED[keyof typeof ACTOR_TYPES_LOCALIZED];

export {
  ACTOR_TYPES,
  ACTOR_TYPES_LOCALIZED,
  characterActorType,
};

export type {
  ActorType,
  ActorTypeLocalizationValues,
  CharacterActorType,
};
