import { LogHelper } from '@helpers/logHelper.mjs';
import { ActiveEffectSystemData, ActiveEffectSystemSource } from './index.mjs';
import type { DocumentConstructionContext } from '@common/_types.mjs';
import { EffectType } from '../index.mjs';
import { getDisplayName } from '@entities/components/CoreMixin/logic/displayName.mjs';
import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';

type DnD35eActiveEffectFlags<T extends object = Record<string, unknown>> = Record<string, Record<string, unknown>> & {
  dnd35e: T;
};

type Dnd35eActiveEffectSource<
  TEffectType extends EffectType = EffectType,
  TSystemSource extends ActiveEffectSystemSource = ActiveEffectSystemSource
> = foundry.documents.ActiveEffectSource<TEffectType, TSystemSource>;

class DnD35eActiveEffect<TParent extends ActorDnd35e | ItemDnd35e<any, ActorDnd35e | null> | null = ActorDnd35e | ItemDnd35e<any, ActorDnd35e | null> | null>
  extends foundry.documents.ActiveEffect<TParent> {
  declare flags: DnD35eActiveEffectFlags;
  declare system: ActiveEffectSystemData;

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
    args: [source: PreCreate<Dnd35eActiveEffectSource>, context?: DocumentConstructionContext<ActorDnd35e | ItemDnd35e<any, ActorDnd35e | null> | null>],
  ) {
    const [source] = args;
    const type = source?.type;
    const ItemClass = CONFIG.Dnd35e.activeEffect.documentClasses[type] as unknown as typeof DnD35eActiveEffect;
    // const ItemClass: typeof ItemDnd35e = CONFIG.Dnd35e.item.documentClasses[type];
    if (!ItemClass) {
      LogHelper.error(`Item type ${type} does not exist or is not properly supported for ItemProxyDnd35e`);
    }
    return new ItemClass(...args);
  },
});

export { DnD35eActiveEffect, ActiveEffectProxyDnd35e };
export type { DnD35eActiveEffectFlags };