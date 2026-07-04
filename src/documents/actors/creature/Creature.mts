import { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { DocumentConstructionContext } from '@common/_types.mjs';
import { DOCUMENT_UPDATE_TYPES } from '@constants/documentUpdateTypes.mjs';
import type { DocumentUpdateOptions, HpAdjustmentMetadata } from '@documents/document/DocumentDnd35e.mjs';
import { calculateStandardAC, calculateTouchAC } from '@helpers/AC.mjs';

import type { CreatureSystemData, CreatureSystemSource } from './data/index.mjs';
import { ADJUST_HP_EVENT } from './events/adjustHp.mjs';
import { CreatureLifeCycle } from './events/CreatureLifeCycle.mjs';
import type { DamageTakenPayload } from './events/damageTaken.mjs';
import type { DeathPayload } from './events/death.mjs';
import type { DisabledViaHealthPayload } from './events/disabledViaHealth.mjs';
import type { DyingPayload } from './events/dying.mjs';
import type { HealingReceivedPayload } from './events/healingReceived.mjs';
import { registerCreatureEventChecks } from './events/index.mjs';
import type { NonlethalTakenPayload } from './events/nonlethalTaken.mjs';
import { registerCreatureEvents } from './events/registerCreatureEvents.mjs';
import type { StaggeredFromNonLethalPayload } from './events/staggeredFromNonLethal.mjs';
import type { TempHpChangedPayload } from './events/tempHpChanged.mjs';
import type { UnconsciousFromNonLethalPayload } from './events/unconsciousFromNonLethal.mjs';
import { handleUpdateHpViaDamage } from './logic/updateHpViaDamage.mjs';
import { handleUpdateHpViaHealing } from './logic/updateHpViaHealing.mjs';
import { handleNonLethalDamageUpdate } from './logic/updateNonlethalDamage.mjs';
import { updateTempHp } from './logic/updateTempHp.mjs';
import { HP_ADJUSTMENT_TYPE, type HpAdjustmentType } from './sheet/components/constants.mjs';
import type { HpUpdateMetadata } from './types.mjs';

type CreatureSource = Omit<foundry.documents.ActorSource, 'system'>
  & { system: CreatureSystemSource; };

/**
 * Abstract base for all creature-type actors (characters, NPCs, etc.).
 * Provides creature-shared schema (abilities, HP, BAB, AC, saves, init,
 * alignment, size, bio, speed) and the lifecycle event surface that all
 * creatures share.
 */
abstract class Creature extends ActorDnd35e {
  constructor(data: PreCreate<CreatureSource>, context?: DocumentConstructionContext<null>) {
    super(data, context);
    
    // register built-in lifecycle events for this document type
    registerCreatureEventChecks(this);

    // todo: sometime in alpha remove these
    // Test event subscriptions
    this.events.on(ADJUST_HP_EVENT, (payload) => {
      console.log('Creature adjustHp event fired', payload);
    });
    this.events.on(CreatureLifeCycle.bloodied, (payload) => {
      console.log('Creature bloodied event fired', payload);
    });
    this.events.on(CreatureLifeCycle.damageTaken, (payload: DamageTakenPayload) => {
      // TODO[statuses]: future hook point for damage reactions (DR, retaliation, etc.)
      console.log('[dnd35e] DAMAGE TAKEN', this.name, payload);
    });
    this.events.on(CreatureLifeCycle.healingReceived, (payload: HealingReceivedPayload) => {
      // TODO[statuses]: future hook point for healing reactions
      console.log('[dnd35e] HEALING RECEIVED', this.name, payload);
    });
    this.events.on(CreatureLifeCycle.nonlethalTaken, (payload: NonlethalTakenPayload) => {
      console.log('[dnd35e] NONLETHAL TAKEN', this.name, payload);
    });
    this.events.on(CreatureLifeCycle.tempHpChanged, (payload: TempHpChangedPayload) => {
      console.log('[dnd35e] TEMP HP CHANGED', this.name, payload);
    });
    this.events.on(CreatureLifeCycle.died, (payload: DeathPayload) => {
      // TODO[statuses]: set or remove 'dead' status based on payload.isDead
      console.log('[dnd35e] DEATH', this.name, payload.isDead ? 'ENTERED' : 'LEFT', payload);
    });
    this.events.on(CreatureLifeCycle.dying, (payload: DyingPayload) => {
      // TODO[statuses]: set or remove 'dying' status based on payload.isDying
      console.log('[dnd35e] DYING', this.name, payload.isDying ? 'ENTERED' : 'LEFT', payload);
    });
    this.events.on(CreatureLifeCycle.disabledViaHealth, (payload: DisabledViaHealthPayload) => {
      // TODO[statuses]: set or remove 'disabled' status based on payload.isDisabled
      console.log('[dnd35e] DISABLED', this.name, payload.isDisabled ? 'ENTERED' : 'LEFT', payload);
    });
    this.events.on(CreatureLifeCycle.staggeredFromNonLethal, (payload: StaggeredFromNonLethalPayload) => {
      // TODO[statuses]: set or remove 'staggered' status based on payload.isStaggered
      console.log('[dnd35e] STAGGERED (NL)', this.name, payload.isStaggered ? 'ENTERED' : 'LEFT', payload);
    });
    this.events.on(CreatureLifeCycle.unconsciousFromNonLethal, (payload: UnconsciousFromNonLethalPayload) => {
      // TODO[statuses]: set or remove 'unconscious' status based on payload.isUnconscious
      console.log('[dnd35e] UNCONSCIOUS (NL)', this.name, payload.isUnconscious ? 'ENTERED' : 'LEFT', payload);
    });
  }

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
    ...CreatureLifeCycle,
  } as const;

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    // stub value to for sheet building; replace with real HP calculation when progression is implemented
    this.system.hp.max = 100;
  }

  async updateHP(
    amount: number,
    adjustmentType: HpAdjustmentType,
    metadata?: HpUpdateMetadata
  ): Promise<boolean> {
    const updateObject: Record<string, number> = {};
    const updatedHp = {
      ...this.system.hp,
    };

    // todo: DR should live here too, likely also in updateHpViaDamage
    if (adjustmentType === HP_ADJUSTMENT_TYPE.NONLETHAL_ADJUSTMENT) {
      const { newNonLethal } = handleNonLethalDamageUpdate(this.system.hp, amount, updateObject);
      updatedHp.nonlethal = newNonLethal;
    }    
    else if (adjustmentType === HP_ADJUSTMENT_TYPE.TEMPORARY_ADJUSTMENT) {
      const { newTempHp } = updateTempHp(this.system.hp, amount, updateObject);
      updatedHp.temp = newTempHp;
    }
    else if (adjustmentType === HP_ADJUSTMENT_TYPE.HEALING_ADJUSTMENT) {
      const { newHp, newNonlethal } = handleUpdateHpViaHealing(this.system.hp, amount, updateObject);
      updatedHp.current = newHp;
      updatedHp.nonlethal = newNonlethal;
    }
    else {
      const { newHp, newTempHp } = handleUpdateHpViaDamage(this.system.hp, amount, updateObject);
      updatedHp.current = newHp;
      updatedHp.temp = newTempHp;
    }

    const updateMetadata: HpAdjustmentMetadata = {
      updateType: DOCUMENT_UPDATE_TYPES.HP_ADJUSTMENT_UPDATE,
      sourceDocumentId: metadata?.attackerId,
      sourceMessage: metadata?.source,
      damageType: metadata?.damageType,
      hpAdjustmentType: adjustmentType,
      adjustmentAmount: amount,
    };

    return !!(await this.update(updateObject, { updateMetadata } as DocumentUpdateOptions));
  }
}

registerCreatureEvents();

type CreatureLike = ActorDnd35e & Creature;

export { Creature };
export type { CreatureLike, CreatureSource };
