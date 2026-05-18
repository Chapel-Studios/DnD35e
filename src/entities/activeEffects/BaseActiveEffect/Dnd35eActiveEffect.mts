import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { DocumentConstructionContext } from '@common/_types.mjs';
import { Dnd35eDocumentMixin } from '@ec/CoreMixin/Dnd35eDocument.mjs';
import { getDisplayName } from '@ec/CoreMixin/index.mjs';
import type { ActiveEffectSystemData, Dnd35eActiveEffectSystemSource } from '@effects/BaseActiveEffect/data/ActiveEffectSystemData.mjs';
import { EFFECT_CHANGE_TARGET } from '@effects/BaseActiveEffect/data/constants.mjs';
import type { EffectType } from '@effects/effectTypes.mjs';
import { GENERAL_EFFECT_TYPE } from '@effects/effectTypes.mjs';
import { LogHelper } from '@helpers/logHelper.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/itemTypes.mjs';

type Dnd35eActiveEffectFlags<T extends object = Record<string, unknown>> = Record<string, Record<string, unknown>> & {
  dnd35e: T;
};

type Dnd35eActiveEffectSource<
  TEffectType extends EffectType = EffectType,
  TSystemSource extends Dnd35eActiveEffectSystemSource = Dnd35eActiveEffectSystemSource
> = foundry.documents.ActiveEffectSource<TEffectType, TSystemSource>;

// Apply mixin at runtime but cast to preserve generic parameter compatibility.
// TypeScript mixins erase generics; this cast is safe because the mixin only adds
// methods/properties and doesn't alter the constructor signature's generic behavior.
const Dnd35eActiveEffectBase = Dnd35eDocumentMixin(foundry.documents.ActiveEffect) as unknown as typeof foundry.documents.ActiveEffect;

class Dnd35eActiveEffect<
  TParent extends ActorDnd35e | ItemDnd35e<ItemType> | null = ActorDnd35e | ItemDnd35e<ItemType> | null,
  TEffectType extends EffectType = EffectType,
  TSystemData extends ActiveEffectSystemData = ActiveEffectSystemData
>
  extends Dnd35eActiveEffectBase<TParent> {
  declare flags: Dnd35eActiveEffectFlags;
  declare system: TSystemData;
  declare type: TEffectType;

  static override get metadata () {
    return Object.freeze(foundry.utils.mergeObject(super.metadata, {
      baseTypeAllowed: false,
    }, { inplace: false }));
  }

  /**
   * Transfer is computed based on whether the effect has any actor-targeted changes.
   * Effects with only item-targeted changes do not transfer to the actor.
   */
  override get transfer (): boolean {
    return this.system.changes.some(change => change.target === EFFECT_CHANGE_TARGET.ACTOR);
  }

  /**
   * Whether this effect has any changes that target the item.
   */
  get hasItemChanges (): boolean {
    return this.system.changes.some(change => change.target === EFFECT_CHANGE_TARGET.ITEM);
  }

  get _displayName (): string {
    return getDisplayName<ActiveEffectSystemData>(this.name, this.system, this);
  }

  get displayName (): string {
    return this._displayName;
  }

  get localizedType (): string {
    return game.i18n.localize('dnd35e.EFFECT.General.Type');
  }
}

const ActiveEffectProxyDnd35e = new Proxy(Dnd35eActiveEffect, {
  construct (
    _target,
    args: [source: PreCreate<Dnd35eActiveEffectSource>, context?: DocumentConstructionContext<ActorDnd35e | ItemDnd35e<ItemType> | null>]
  ) {
    const [source] = args;
    let type = source?.type;

    // Coerce missing/base type to 'general' — dnd35e does not allow the base AE type
    if (!type || !(type in CONFIG.dnd35e.activeEffect.documentClasses) && type !== GENERAL_EFFECT_TYPE) {
      LogHelper.warn(`ActiveEffect created with unsupported type '${type ?? ''}', coercing to '${GENERAL_EFFECT_TYPE}'`);
      if (source) source.type = GENERAL_EFFECT_TYPE;
      type = GENERAL_EFFECT_TYPE;
    }

    if (type === GENERAL_EFFECT_TYPE) {
      return new Dnd35eActiveEffect(...args);
    }
    const ItemClass = CONFIG.dnd35e.activeEffect.documentClasses[type] as unknown as typeof Dnd35eActiveEffect;
    if (!ItemClass) {
      LogHelper.error(`ActiveEffect type ${type} does not exist or is not properly supported for ActiveEffectProxyDnd35e`);
      return new Dnd35eActiveEffect(...args);
    }
    return new ItemClass(...args);
  },
});

export { ActiveEffectProxyDnd35e, Dnd35eActiveEffect };
export type { Dnd35eActiveEffectFlags };
