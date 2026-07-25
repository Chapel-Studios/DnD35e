import { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { DocumentConstructionContext } from '@common/_types.mjs';
import type { DatabaseCreateCallbackOptions } from '@common/abstract/_types.mjs';
import { getEncumberedSpeed } from '@constants/carryingCapacity.mjs';
import { DOCUMENT_UPDATE_TYPES } from '@constants/documentUpdateTypes.mjs';
import type { DocumentUpdateMetadata, DocumentUpdateOptions } from '@documents/document/DocumentDnd35e.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/index.mjs';
import { EFFECT_CHANGE_TYPE, FINAL_EFFECT_CHANGE_PHASE } from '@effects/baseActiveEffect/data/index.mjs';
import { calculateStandardAC, calculateTouchAC } from '@helpers/AC.mjs';

import { _debugCreature, isCreatureDebugEnabled } from './_debug.mjs';
import type { CreatureSystemData, CreatureSystemSource } from './data/index.mjs';
import { CreatureLifeCycle } from './events/CreatureLifeCycle.mjs';
import { registerCreatureEventChecks } from './events/index.mjs';
import { registerCreatureEvents } from './events/registerCreatureEvents.mjs';
import { buildPrototypeTokenDefaults } from './logic/buildPrototypeTokenDefaults.mjs';
import { handleUpdateHpViaDamage } from './logic/updateHpViaDamage.mjs';
import { handleUpdateHpViaHealing } from './logic/updateHpViaHealing.mjs';
import { handleNonLethalDamageUpdate } from './logic/updateNonlethalDamage.mjs';
import { updateTempHp } from './logic/updateTempHp.mjs';
import { HP_ADJUSTMENT_TYPE, type HpAdjustmentType } from './sheet/components/constants.mjs';
import type { HpUpdateMetadata } from './types.mjs';

type CreatureSource = Omit<foundry.documents.ActorSource, 'system'>
  & { system: CreatureSystemSource; };

interface HpAdjustmentMetadata extends DocumentUpdateMetadata {
  updateType: typeof DOCUMENT_UPDATE_TYPES.HP_ADJUSTMENT_UPDATE;
  adjustmentAmount: number;
  damageType?: string;
  hpAdjustmentType: HpAdjustmentType,
}

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
    if (isCreatureDebugEnabled) {
      _debugCreature(this);
    }
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
   * Stub: returns 'null' (uncapped) until the Armor item type is implemented.
   * Will be replaced with a getter that resolves a value from worn Armor items.
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

  protected _buildEncumberedChanges(): EffectChangeDataDnd35e[] {
    // Tier 0 (light) has no penalty at all. Tier 1 (medium) gets the moderate penalty;
    // tier 2+ (heavy and beyond) gets the severe penalty - SRD does not further intensify
    // max Dex/check penalty past heavy, only speed keeps degrading (see getEncumberedSpeed).
    if (this.system.encumbrance.tier <= 0) return [];

    const results: EffectChangeDataDnd35e[] = [];
    const encumbranceTier = this.system.encumbrance.tier;
    const effectLabel = game.i18n.localize(`dnd35e.CREATURE.FIELDS.encumbrance.tier.${encumbranceTier}`);

    const pushChange = (key: string, value: number): void => {
      results.push({
        key,
        target: 'actor',
        isSystem: true,
        type: EFFECT_CHANGE_TYPE.DOWNGRADE,
        value: value,
        priority: 20,
        phase: FINAL_EFFECT_CHANGE_PHASE,
        label: effectLabel,
      });
    };

    // `this.system.speed.land` is safe to read directly here: `getSelfContributedChanges()`
    // runs from `ActorDnd35e.applyActiveEffects('final')`, which fires after
    // `prepareDerivedData()` has fully settled and before this pass applies its own
    // downgrade - so the value is always fresh, never a stale downgrade from a prior pass.
    const landSpeed = this.system.speed.land;
    const encumberedSpeed = getEncumberedSpeed(landSpeed, encumbranceTier);
    const isModeratelyEncumbered = encumbranceTier === 1;
    const maxDexBonus = isModeratelyEncumbered
      ? 3
      : 1;
    const armorCheckPenalty = isModeratelyEncumbered
      ? -3
      : -6;


    pushChange('system.encumbrance.maxDexBonus', maxDexBonus);
    pushChange('system.abilities.dex.mod', maxDexBonus);
    pushChange('system.encumbrance.armorCheckPenalty', armorCheckPenalty);
    if (encumberedSpeed < landSpeed) {
      pushChange('system.speed.land', encumberedSpeed);
    }

    return results;
  }

  /**
   * Live, actor-targeted encumbrance-penalty changes (max Dex bonus, armor check
   * penalty, land speed downgrade) - see `ActorDnd35e.getSelfContributedChanges()`.
   * Recomputed fresh from this actor's own current encumbrance tier on every call;
   * never persisted, so there is no AE document to seed, toggle, or race against.
   */
  override getSelfContributedChanges(phase: string): EffectChangeDataDnd35e[] {
    return this._buildEncumberedChanges().filter((change) => change.phase === phase);
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

  /**
   * Prototype token defaults shared by all creature-type actors (characters, NPCs,
   * etc.): linked token, friendly disposition, owner-hover HP bar, and basic vision
   * enabled so a freshly-placed token isn't blind. Size derivation happens separately
   * in `TokenDocumentDnd35e._preCreate()` from `system.size` once the token is placed.
   */
  protected override async _preCreate(
    data: this['_source'],
    options: DatabaseCreateCallbackOptions,
    user: foundry.documents.BaseUser
  ): Promise<boolean | void> {
    const result = await super._preCreate(data, options, user);
    if (result === false) return false;

    this.updateSource({
      prototypeToken: {
        ...buildPrototypeTokenDefaults(),
        ...data.prototypeToken,
      },
    });
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();

    // stub value to 100 for sheet building; replace with real HP calculation when progression is implemented
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
export type {
  CreatureLike,
  CreatureSource,
  HpAdjustmentMetadata,
};
