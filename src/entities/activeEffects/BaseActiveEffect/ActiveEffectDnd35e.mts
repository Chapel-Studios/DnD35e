import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { DocumentConstructionContext } from '@common/_types.mjs';
import { DocumentMixin } from '@ec/CoreMixin/DocumentDnd35e.mjs';
import { getDisplayName } from '@ec/CoreMixin/index.mjs';
import type { ActiveEffectSystemData, ActiveEffectSystemSourceDnd35e } from '@effects/BaseActiveEffect/data/ActiveEffectSystemData.mjs';
import { EFFECT_CHANGE_TARGET } from '@effects/BaseActiveEffect/data/constants.mjs';
import type { EffectType } from '@effects/effectTypes.mjs';
import { GENERAL_EFFECT_TYPE } from '@effects/effectTypes.mjs';
import { LogHelper } from '@helpers/logHelper.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/itemTypes.mjs';

type ActiveEffectFlags<T extends object = Record<string, unknown>> = Record<string, Record<string, unknown>> & {
  dnd35e: T;
};

type ActiveEffectSourceDnd35e<
  TEffectType extends EffectType = EffectType,
  TSystemSource extends ActiveEffectSystemSourceDnd35e = ActiveEffectSystemSourceDnd35e
> = foundry.documents.ActiveEffectSource<TEffectType, TSystemSource>;

// Apply mixin at runtime but cast to preserve generic parameter compatibility.
// TypeScript mixins erase generics; this cast is safe because the mixin only adds
// methods/properties and doesn't alter the constructor signature's generic behavior.
const ActiveEffectBase = DocumentMixin(foundry.documents.ActiveEffect) as unknown as typeof foundry.documents.ActiveEffect;

class ActiveEffectDnd35e<
  TParent extends ActorDnd35e | ItemDnd35e<ItemType> | null = ActorDnd35e | ItemDnd35e<ItemType> | null,
  TEffectType extends EffectType = EffectType,
  TSystemData extends ActiveEffectSystemData = ActiveEffectSystemData
>
  extends ActiveEffectBase<TParent> {
  declare flags: ActiveEffectFlags;
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

const ActiveEffectProxyDnd35e = new Proxy(ActiveEffectDnd35e, {
  construct (
    _target,
    args: [source: PreCreate<ActiveEffectSourceDnd35e>, context?: DocumentConstructionContext<ActorDnd35e | ItemDnd35e<ItemType> | null>]
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
      return new ActiveEffectDnd35e(...args);
    }
    const EffectClass = CONFIG.dnd35e.activeEffect.documentClasses[type] as unknown as typeof ActiveEffectDnd35e;
    if (!EffectClass) {
      LogHelper.error(`ActiveEffect type ${type} does not exist or is not properly supported for ActiveEffectProxyDnd35e`);
      return new ActiveEffectDnd35e(...args);
    }
    return new EffectClass(...args);
  },
});

export { ActiveEffectDnd35e, ActiveEffectProxyDnd35e };
export type { ActiveEffectFlags, ActiveEffectSourceDnd35e };
