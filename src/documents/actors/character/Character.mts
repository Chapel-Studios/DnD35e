import type { CharacterActorType } from '@actors/actorTypes.mjs';
import { Creature } from '@actors/creature/Creature.mjs';
import type { DatabaseCreateCallbackOptions } from '@common/abstract/_types.mjs';

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

  protected override async _preCreate(
    data: this['_source'],
    options: DatabaseCreateCallbackOptions,
    user: foundry.documents.BaseUser
  ): Promise<boolean | void> {
    const result = await super._preCreate(data, options, user);
    if (result === false) return false;

    const isPartyMember = foundry.utils.getProperty(data, 'system.settings.isPartyMember');
    if (isPartyMember === undefined || isPartyMember === null) {
      this.updateSource({
        system: {
          settings: {
            isPartyMember: true,
          },
        },
      });
    }
  }

  /**
   * Stub: returns 'Paladin 1' until the Class item type is implemented.
   * Will be replaced with a getter that resolves a value from Class items.
   */
  get classShorthand(): string {
    return 'Paladin 1';
  }
}

type CharacterType = Character;

export { Character };
export type { CharacterSource, CharacterType };
