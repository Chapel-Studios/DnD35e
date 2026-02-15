import { LogHelper } from '@helpers/logHelper.mjs';
import { ITEM_TYPES } from '@items/index.mjs';
import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import EmbeddedCollection from '@common/abstract/embedded-collection.mjs';
import { DnD35eActiveEffect } from '@entities/activeEffects/index.mjs';
import type { DocumentConstructionContext } from '@common/_types.mjs';
import type { ItemType } from '@items/index.mjs';
import type { ItemSheetDnd35e, ItemSystemData, ItemSystemSource } from './index.mjs';
import { VueItemSheet } from '@vc/VueApplication.mjs';
import { getDisplayName } from '@entities/components/CoreMixin/logic/displayName.mjs';
import { ActiveEffectPhase } from '@client/documents/actor.mjs';
import { EffectChangeData } from '@common/documents/active-effect.mjs';
import type { ActiveEffectChangeMode } from '@common/constants.mjs';

type ItemSourceDnd35e<TItemType extends ItemType = ItemType> = foundry.documents.ItemSource<TItemType, ItemSystemSource>;

class ItemDnd35e<TItemType extends ItemType = ItemType, TParent extends ActorDnd35e | null = ActorDnd35e | null> extends foundry.documents.Item<TParent> {
  declare readonly effects: EmbeddedCollection<DnD35eActiveEffect<this>>;
  declare type: TItemType;
  declare system: ItemSystemData;
  declare _source: ItemSourceDnd35e<TItemType>;
  declare _sheet: ItemSheetDnd35e<any> | null;

  _completedActiveEffectPhases: Set<string> = new Set();

  override get sheet (): ItemSheetDnd35e<any> | null {
    if (!this._sheet) {
      const superSheet = super.sheet;
      if (!superSheet) {
        const SheetClass = this._getSheetClass() as unknown as {
          new (document: any, options?: any): ItemSheetDnd35e<any>;
        };
        // Only instantiate if it's a VueApplication subclass
        if (foundry.utils.isSubclass(SheetClass, VueItemSheet)) {
          this._sheet = new SheetClass(this, { editable: this.isOwner });
        }
      }
    }

    return this._sheet;
  }

  override prepareBaseData (): void {
    super.prepareBaseData();
    // I don't actually think this is needed
    // this.system ??= this._createFreshSystemData();
  }

  override prepareEmbeddedDocuments (): void {
    super.prepareEmbeddedDocuments();
    this.applyActiveEffects(ActiveEffectPhase.INITIAL);
  }

  // ACtive Effect Implementation from actor.mjs on version 14.354, since items don't have their own applyActiveEffects method, but they do have active effects that need to be applied to themselves when prepareEmbeddedDocuments is called
  /**
   * An object that tracks which tracks the changes to the data model which were applied by active effects
   * @type {object}
   */
  overrides: Record<string, unknown> = {};

  *allApplicableEffects() {
    for (const effect of this.effects) {
      if (!effect.transfer) yield effect;
    }
  }

  // this function is laregly copied directly from actor.mjs on version 14.354
  applyActiveEffects(phase: string) {
    const {
      CHANGE_PHASES,
    } = foundry.documents.ActiveEffect;
    if ( !(phase in CHANGE_PHASES) ) {
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

    const changes: EffectChangeData<this>[] = [];
    for ( const effect of this.allApplicableEffects() ) {
      if ( !effect.active ) continue;
      for ( const change of effect.system.changes ) {
        if ( !change.key || (change.phase !== phase) ) continue;
        const copy: EffectChangeData<this> = {
          key: change.key,
          value: change.value,
          mode: change.mode as ActiveEffectChangeMode,
          priority: change.priority ?? 0,
          phase: change.phase,
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
    changes.sort((a, b) => a.priority - b.priority);
    foundry.documents.ActiveEffect._shimChanges(changes);

    // Apply all changes
    const overrides = {};
    const replacementData = this.getRollData();
    for ( const change of changes ) {
      const result = ActiveEffect.CHANGE_TYPES[change.type].handler?.(this, change)
        ?? change.effect?.constructor.applyChange(this, change, {replacementData});
      if ( foundry.utils.isPlainObject(result) ) Object.assign(overrides, result);
    }

    // Expand the set of final overrides
    foundry.utils.mergeObject(this.overrides, foundry.utils.expandObject(overrides));
  }

  // _createFreshSystemData (): ItemSystemData {
  //   return {
  //     description: { value: '' },
  //     version: CONFIG.Dnd35e.VERSION,
  //     isNameFromFormula: false,
  //     isPsionic: false,
  //     isEpic: false,
  //   };
  // }
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
