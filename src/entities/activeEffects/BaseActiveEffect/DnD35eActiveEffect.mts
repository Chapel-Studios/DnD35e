import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { DocumentConstructionContext } from '@common/_types.mjs';
import { getDisplayName } from '@ec/CoreMixin/index.mjs';
import type { ActiveEffectSystemData, Dnd35eActiveEffectSystemSource } from '@effects/BaseActiveEffect/index.mjs';
import { EFFECT_CHANGE_TARGET } from '@effects/BaseActiveEffect/index.mjs';
import { BASE_EFFECT_TYPE, EffectType } from '@effects/index.mjs';
import { LogHelper } from '@helpers/logHelper.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import { ItemType } from '@items/itemTypes.mjs';

type DnD35eActiveEffectFlags<T extends object = Record<string, unknown>> = Record<string, Record<string, unknown>> & {
  dnd35e: T;
};

type Dnd35eActiveEffectSource<
  TEffectType extends EffectType = EffectType,
  TSystemSource extends Dnd35eActiveEffectSystemSource = Dnd35eActiveEffectSystemSource
> = foundry.documents.ActiveEffectSource<TEffectType, TSystemSource>;

class DnD35eActiveEffect<
  TParent extends ActorDnd35e | ItemDnd35e<ItemType> | null = ActorDnd35e | ItemDnd35e<ItemType> | null,
  TEffectType extends EffectType = EffectType,
  TSystemData extends ActiveEffectSystemData = ActiveEffectSystemData
>
  extends foundry.documents.ActiveEffect<TParent> {
  declare flags: DnD35eActiveEffectFlags;
  declare system: TSystemData;
  declare type: TEffectType;

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
}

const ActiveEffectProxyDnd35e = new Proxy(DnD35eActiveEffect, {
  construct (
    _target,
    args: [source: PreCreate<Dnd35eActiveEffectSource>, context?: DocumentConstructionContext<ActorDnd35e | ItemDnd35e<ItemType> | null>]
  ) {
    const [source] = args;
    const type = source?.type;
    if (type === BASE_EFFECT_TYPE) {
      return new foundry.documents.ActiveEffect(...args);
    }
    const ItemClass = CONFIG.dnd35e.activeEffect.documentClasses[type] as unknown as typeof DnD35eActiveEffect;
    // const ItemClass: typeof ItemDnd35e = CONFIG.Dnd35e.item.documentClasses[type];
    if (!ItemClass) {
      LogHelper.error(`ActiveEffect type ${type} does not exist or is not properly supported for ActiveEffectProxyDnd35e`);
      return new foundry.documents.ActiveEffect(...args);
    }
    return new ItemClass(...args);
  },
});

export { ActiveEffectProxyDnd35e, DnD35eActiveEffect };
export type { DnD35eActiveEffectFlags };
