import type { CharacterActorType } from '@actors/actorTypes.mjs';
import { Creature } from '@actors/creature/Creature.mjs';

import type { CreatureSource } from '../creature/Creature.mjs';
import type { CharacterSystemData, CharacterSystemSource } from './data/index.mjs';

type CharacterSource = Omit<CreatureSource, 'system'>
  & { system: CharacterSystemSource; };

/**
 * Player Character actor. Extends Creature with character-specific schema
 * (XP, party-membership) and lifecycle events.
 */
class Character extends Creature {
  declare system: CharacterSystemData;
  declare type: CharacterActorType;

  /**
   * Static registry of lifecycle event names for this class.
   * Subclasses extend via spread:
   *   `static override readonly LifeCycle = { ...Character.LifeCycle, levelUp: 'levelUp' } as const`
   *
   * Emission points for level-up / XP events land in Phase 9 (Class System).
   */
  static override readonly LifeCycle = {
    ...super.LifeCycle,
    /** Character gained a level. Payload TBD (Emission: Phase 9) */
    levelUp: 'levelUp',
    /** Character was awarded XP. Payload TBD (Emission: Phase 9) */
    awardXp: 'awardXp',
  } as const;
}

type CharacterType = Character;

export { Character };
export type { CharacterSource, CharacterType };
