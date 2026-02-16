import { LogHelper } from '@helpers/logHelper.mjs';
import { ITEM_TYPES } from '@items/index.mjs';
import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import type EmbeddedCollection from '@common/abstract/embedded-collection.mjs';
import type { DnD35eActiveEffect } from '@effects/index.mjs';
import type { DocumentConstructionContext } from '@common/_types.mjs';
import type { ItemType } from '@items/index.mjs';
import type { ItemSheetDnd35e, ItemSystemData, ItemSystemSource } from './index.mjs';
import { getDisplayName } from '@ec/CoreMixin/index.mjs';
import type { EffectChangeData } from '@common/documents/active-effect.mjs';
import { EFFECT_CHANGE_PHASE, EFFECT_CHANGE_TYPE } from '@effects/BaseActiveEffect/index.mjs';

type ItemSourceDnd35e<TItemType extends ItemType = ItemType> = foundry.documents.ItemSource<TItemType, ItemSystemSource>;

class ItemDnd35e<TItemType extends ItemType = ItemType, TParent extends ActorDnd35e | null = ActorDnd35e | null> extends foundry.documents.Item<TParent> {
  declare readonly effects: EmbeddedCollection<DnD35eActiveEffect<this>>;
  declare type: TItemType;
  declare system: ItemSystemData;
  declare _source: ItemSourceDnd35e<TItemType>;
  declare _sheet: ItemSheetDnd35e<any> | null;

  _completedActiveEffectPhases: Set<string> = new Set();

  // override get sheet (): ItemSheetDnd35e<any> | null {
  //   if (!this._sheet) {
  //     const superSheet = super.sheet;
  //     if (!superSheet) {
  //       const SheetClass = this._getSheetClass() as unknown as {
  //         new (document: any, options?: any): ItemSheetDnd35e<any>;
  //       };
  //       // Only instantiate if it's a VueApplication subclass
  //       if (foundry.utils.isSubclass(SheetClass, VueItemSheet)) {
  //         this._sheet = new SheetClass(this, { editable: this.isOwner });
  //       }
  //     }
  //   }

  //   return this._sheet;
  // }

  override prepareBaseData (): void {
    super.prepareBaseData();
  }

  override prepareEmbeddedDocuments (): void {
    super.prepareEmbeddedDocuments();
    this.applyActiveEffects(EFFECT_CHANGE_PHASE.INITIAL);
  }

  // Active Effect Implementation from actor.mjs on version 14.354, since items don't have their own applyActiveEffects method, but they do have active effects that need to be applied to themselves when prepareEmbeddedDocuments is called
  overrides: Record<string, unknown> = {};

  *allApplicableEffects() {
    for (const effect of this.effects) {
      if (!effect.transfer) yield effect;
    }
  }

  // this function is laregly copied directly from actor.mjs on version 14.354
  applyActiveEffects(phase: string) {
    const ActiveEffect = foundry.documents.ActiveEffect;
    if ( !(phase in ActiveEffect.CHANGE_PHASES) ) {
      // TODO: we should probably incorporate the below into our logger at some point, since this is how foundrty does it
      // but for now we'll just use this to avoid adding a dependency on hook in our type definitions
      // Also, does that throw the error?
      // const error = new Error(`"${phase}" is not a registered ActiveEffect application phase.`);
      // Hooks.onError("Actor#applyActiveEffects", error, {log: "error"});
      LogHelper.error(`ActiveEffect application phase "${phase}" is not a registered phase.`);
      return;
    }
    if ( this._completedActiveEffectPhases.has(phase) ) {
      // const error = new Error(`ActiveEffect application phase "${phase}" has already completed and cannot be run again in this Actor's data-preparation cycle.`);
      // Hooks.onError("Actor#applyActiveEffects", error, {log: "error"});
      LogHelper.error(`ActiveEffect application phase "${phase}" has already completed and cannot be run again in this Actor's data-preparation cycle.`);
      return;
    }
    this._completedActiveEffectPhases.add(phase);

    type AppliedItemEffectChange = EffectChangeData<ItemDnd35e<TItemType, TParent>>
      & { type: string; effect: DnD35eActiveEffect<ItemDnd35e<TItemType, TParent>> };
    const changes: AppliedItemEffectChange[] = [];
    for ( const effect of this.allApplicableEffects() ) {
      if ( !effect.active ) continue;
      for ( const change of effect.system.changes ) {
        if ( !change.key || (change.phase !== phase) ) continue;
        const copy: AppliedItemEffectChange = {
          key: change.key,
          value: String(change.value),
          phase: change.phase,
          priority: change.priority ?? 0,
          type: change.type ?? EFFECT_CHANGE_TYPE.ADD,
          effect,
        };
        changes.push(copy);
      }
      // Not sure how statuses should interact with item active effects, since they don't have tokens,
      // but we'll keep this here for now in case we want to add some sort of status effect functionality to items in the future.
      // if ( phase === 'initial' ) {
      //   for ( const statusId of effect.statuses ) this.statuses.add(statusId);
      // }
    }
    changes.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    ActiveEffect._shimChanges(changes);

    // Apply all changes
    const overrides: Record<string, unknown> = {};
    const replacementData = this.getRollData() as Record<string, unknown>;
    for ( const change of changes ) {
      const result = ActiveEffect.CHANGE_TYPES[change.type].handler?.(this, change)
        ?? ActiveEffect.applyChange(this, change, { replacementData });
      if ( foundry.utils.isPlainObject(result) ) Object.assign(overrides, result as Record<string, unknown>);
    }

    // Expand the set of final overrides
    foundry.utils.mergeObject(this.overrides, foundry.utils.expandObject(overrides));
  }
  
  get localizedType (): string {
    return ITEM_TYPES[this.type] ??
      'D35E.Item';
  }

  get _displayName (): string {
    return getDisplayName(this.name, this.system, this);
  }

  get displayName (): string {
    return this._displayName;
  }
}

const ItemProxyDnd35e = new Proxy(ItemDnd35e, {
  construct (
    _target,
    args: [source: PreCreate<ItemSourceDnd35e>, context?: DocumentConstructionContext<ActorDnd35e | null>],
  ) {
    const [source] = args;
    const type = source?.type;
    const ItemClass = CONFIG.Dnd35e.item.documentClasses[type] as unknown as typeof ItemDnd35e;
    // const ItemClass: typeof ItemDnd35e = CONFIG.Dnd35e.item.documentClasses[type];
    if (!ItemClass) {
      LogHelper.error(`Item type ${type} does not exist or is not properly supported for ItemProxyDnd35e`);
    }
    return new ItemClass(...args);
  },
});

export { ItemDnd35e, ItemProxyDnd35e };

export type { ItemSourceDnd35e };
