import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { DocumentConstructionContext } from '@common/_types.mjs';
import type EmbeddedCollection from '@common/abstract/embedded-collection.mjs';
import type { EffectChangeData } from '@common/documents/active-effect.mjs';
import { getDisplayName } from '@ec/CoreMixin/index.mjs';
import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE, FINAL_EFFECT_CHANGE_PHASE, INITIAL_EFFECT_CHANGE_PHASE } from '@effects/BaseActiveEffect/index.mjs';
import type { DnD35eActiveEffect } from '@effects/index.mjs';
import { LogHelper } from '@helpers/logHelper.mjs';
import type { ItemType } from '@items/index.mjs';
import { ITEM_TYPES_LOCALIZED } from '@items/itemTypes.mjs';

import type { ItemSystemData, ItemSystemSource } from './index.mjs';

type ItemSourceDnd35e<TItemType extends ItemType = ItemType> = foundry.documents.ItemSource<TItemType, ItemSystemSource>;

class ItemDnd35e<TItemType extends ItemType = ItemType, TParent extends ActorDnd35e | null = ActorDnd35e | null> extends foundry.documents.Item<TParent> {
  constructor(source: PreCreate<ItemSourceDnd35e<TItemType>>, context?: DocumentConstructionContext<TParent>) {
    super(source, context);
    this._completedActiveEffectPhases = new Set();
  }
  declare readonly effects: EmbeddedCollection<DnD35eActiveEffect<this>>;
  declare type: TItemType;
  declare system: ItemSystemData;
  declare _source: ItemSourceDnd35e<TItemType>;
  // declare _sheet: ItemSheetDnd35e<any> | null;

  _completedActiveEffectPhases: Set<string>;

  override prepareBaseData (): void {
    super.prepareBaseData();
    this._completedActiveEffectPhases = new Set();
    this.overrides = {};
  }

  /**
   * @sealed Do not override - manages initial active effect application.
   */
  override prepareEmbeddedDocuments (): void {
    super.prepareEmbeddedDocuments();
    this.applyActiveEffects(INITIAL_EFFECT_CHANGE_PHASE);
  }

  /**
   * @sealed Do not override - manages final active effect application.
   * Override {@link _prepareDerivedItemData} instead.
   */
  override prepareDerivedData (): void {
    super.prepareDerivedData();
    this._prepareDerivedItemData();
    this.applyActiveEffects(FINAL_EFFECT_CHANGE_PHASE);
  }

  /** Override this in subclasses for derived data calculations that should run before final active effects. */
  protected _prepareDerivedItemData (): void {
    // Base implementation - empty, subclasses override
  }

  // Active Effect Implementation from actor.mjs on version 14.354, since items don't have their own applyActiveEffects method, but they do have active effects that need to be applied to themselves when prepareEmbeddedDocuments is called
  overrides: Record<string, unknown> = {};

  /**
   * Get all ActiveEffects that have item-targeted changes.
   * Effects can have both item and actor targeted changes - we yield any effect
   * that has at least one item-targeted change.
   */
  *allApplicableEffects() {
    for (const effect of this.effects) {
      if (effect.hasItemChanges) yield effect;
    }
  }

  /**
   * Apply active effects to this item for the given phase.
   * 
   * Implementation from actor.mjs on version 14.354, since items don't have their own
   * applyActiveEffects method, but they do have active effects that need to be applied
   * to themselves when prepareEmbeddedDocuments is called.
   * 
   * @sealed Do not override - core active effect application logic.
   * @param phase - The effect application phase ('initial' or 'final')
   */
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
        // Only apply item-targeted changes (default to item for backwards compatibility)
        const changeTarget = change.target ?? EFFECT_CHANGE_TARGET.ITEM;
        if ( !change.key || (change.phase !== phase) || (changeTarget !== EFFECT_CHANGE_TARGET.ITEM) ) continue;
        const copy = foundry.utils.deepClone(change) as unknown as AppliedItemEffectChange;
        copy.effect = effect;
        copy.type ??= EFFECT_CHANGE_TYPE.ADD;
        copy.priority ??= 0;
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
      const EffectClass = change.effect.constructor as typeof ActiveEffect;
      const result = ActiveEffect.CHANGE_TYPES[change.type].handler?.(this, change)
        ?? EffectClass.applyChange(this, change, { replacementData });
      if ( foundry.utils.isPlainObject(result) ) Object.assign(overrides, result as Record<string, unknown>);
    }

    // Expand the set of final overrides
    foundry.utils.mergeObject(this.overrides, foundry.utils.expandObject(overrides));
  }
  
  get localizedType (): string {
    return ITEM_TYPES_LOCALIZED[this.type] ??
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
    args: [source: PreCreate<ItemSourceDnd35e>, context?: DocumentConstructionContext<ActorDnd35e | null>]
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
