import { ActorDnd35e } from '@actors/baseActor/index.mjs';

import type { CreatureSystemData, CreatureSystemSource } from './data/index.mjs';

type CreatureSource = Omit<foundry.documents.ActorSource, 'system'>
  & { system: CreatureSystemSource; };

/**
 * Abstract base for all creature-type actors (characters, NPCs, etc.).
 * Provides creature-shared schema (abilities, HP, BAB, AC, saves, init,
 * alignment, size, bio, speed) and the lifecycle event surface that all
 * creatures share.
 */
abstract class Creature extends ActorDnd35e {
  declare system: CreatureSystemData;

  /**
   * Static registry of lifecycle event names for this class.
   * Subclasses extend via spread:
   *   `static override readonly LifeCycle = { ...Creature.LifeCycle, levelUp: 'levelUp' } as const`
   */
  static override readonly LifeCycle = {
    ...super.LifeCycle,
  } as const;
}

type CreatureLike = ActorDnd35e & Creature;

export { Creature };
export type { CreatureLike, CreatureSource };
