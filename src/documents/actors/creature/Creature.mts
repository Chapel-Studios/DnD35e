import { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { calculateStandardAC, calculateTouchAC } from '@helpers/AC.mjs';

import type { CreatureSystemData, CreatureSystemSource } from './data/index.mjs';
import { HP_ADJUSTMENT_TYPE, type HPAdjustmentType } from './sheet/components/constants.mjs';

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
   * Stub: returns 'Human' until the Race item type is implemented.
   * Will be replaced with a getter that resolves a linked Race item.
   */
  get race(): string {
    return 'Human';
  }

  /**
   * Stub: returns '0' until the Armor item type is implemented.
   * Will be replaced with a getter that resolves a value from equipped Armor items.
   */
  get armorBonus(): number 
  {
    return 0;
  }

  /**
   * Stub: returns '0' until the Shield item type is implemented.
   * Will be replaced with a getter that resolves a value from equipped Shield items.
   */
  get shieldBonus(): number 
  {
    return 0;
  }

  /**
   * Stub: returns '0' until the Shield item type is implemented.
   * Will be replaced with a getter that resolves a value from equipped Shield items.
   */
  get maxDexModifier(): number | null
  {
    return null;
  }

  calculateAC(isTouch = false, denyDex = false): number {
    return isTouch
      ? calculateTouchAC(this, denyDex)
      : calculateStandardAC(this, denyDex);
  }

  /**
   * Static registry of lifecycle event names for this class.
   * Subclasses extend via spread:
   *   `static override readonly LifeCycle = { ...Creature.LifeCycle, levelUp: 'levelUp' } as const`
   */
  static override readonly LifeCycle = {
    ...super.LifeCycle,
  } as const;

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    // stub value to for sheet building; replace with real HP calculation when progression is implemented
    this.system.hp.max = 100;
  }

  async updateHP(amount: number, adjustmentType: HPAdjustmentType): Promise<boolean> {
    const updateObject: Record<string, number> = {};
    if (adjustmentType === HP_ADJUSTMENT_TYPE.NONLETHAL_ADJUSTMENT) {
      updateObject['system.hp.nonlethal'] = Math.max(0, this.system.hp.nonlethal + amount);
    }    
    else if (adjustmentType === HP_ADJUSTMENT_TYPE.TEMPORARY_ADJUSTMENT) {
      const newAmount = Math.max(0, this.system.hp.temp + amount);
      updateObject['system.hp.temp'] = newAmount;
    }
    else if (adjustmentType === HP_ADJUSTMENT_TYPE.HEALING_ADJUSTMENT) {
      const newAmount = Math.min(this.system.hp.max, this.system.hp.current + amount);
      updateObject['system.hp.current'] = newAmount;
      const newNonlethal = Math.max(0, this.system.hp.nonlethal - amount);
      updateObject['system.hp.nonlethal'] = newNonlethal;
    }
    else {
      const damageToApplyToTemp = Math.min(this.system.hp.temp, amount);
      const newTemp = Math.max(0, this.system.hp.temp - damageToApplyToTemp);
      updateObject['system.hp.temp'] = newTemp;
      const newCurrent = Math.max(0, (this.system.hp.current || 0) - (amount - damageToApplyToTemp));
      updateObject['system.hp.current'] = newCurrent;
    }
    return !!(await this.update(updateObject));
  }
}

type CreatureLike = ActorDnd35e & Creature;

export { Creature };
export type { CreatureLike, CreatureSource };
