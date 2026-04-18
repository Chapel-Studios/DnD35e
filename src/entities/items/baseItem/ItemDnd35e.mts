import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { DocumentConstructionContext } from '@common/_types.mjs';
import type EmbeddedCollection from '@common/abstract/embedded-collection.mjs';
import type { EffectChangeData } from '@common/documents/active-effect.mjs';
import { getDisplayName } from '@ec/CoreMixin/logic/index.mjs';
import type { Dnd35eEffectChangeData } from '@effects/BaseActiveEffect/data/ActiveEffectSystemData.mjs';
import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE, FINAL_EFFECT_CHANGE_PHASE, INITIAL_EFFECT_CHANGE_PHASE, SYSTEM_CHANGE_TYPE } from '@effects/BaseActiveEffect/data/constants.mjs';
import type { DnD35eActiveEffect } from '@effects/BaseActiveEffect/DnD35eActiveEffect.mjs';
import { secretEffectType } from '@effects/secret/secretEffectType.mjs';
import { LogHelper } from '@helpers/logHelper.mjs';
import type { ChangeHistory, Override, StackingChange } from '@helpers/stacking.mjs';
import { parseNumericChangeValue, resolveActiveEffectChanges, STACK_RESULT_APPLIED, STACK_RESULT_IGNORED } from '@helpers/stacking.mjs';
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

  /** Runtime masks dictionary built from active Secret AE MASK changes. Keyed by field path. */
  _masks: Record<string, unknown> = {};

  override prepareBaseData (): void {
    super.prepareBaseData();
    this._completedActiveEffectPhases = new Set();
    this.overrides = {};
    this._masks = {};
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
    this._buildMasks();
    this._prepareDerivedItemData();
    this.applyActiveEffects(FINAL_EFFECT_CHANGE_PHASE);
  }

  /**
   * Build the _masks dictionary from active Secret AE MASK changes.
   * Highest-priority Secret wins per field path.
   */
  private _buildMasks (): void {
    this._masks = {};
    const secrets = [...this.effects]
      .filter(e => e.type === secretEffectType && e.active)
      .sort((a, b) => {
        const aPriority = a.system.changes[0]?.priority ?? 0;
        const bPriority = b.system.changes[0]?.priority ?? 0;
        return bPriority - aPriority;
      });
    for (const secret of secrets) {
      for (const change of secret.system.changes) {
        if (change.type !== SYSTEM_CHANGE_TYPE.MASK) continue;
        if (!change.key || change.key in this._masks) continue;
        this._masks[change.key] = change.value;
      }
    }
  }

  /** Override this in subclasses for derived data calculations that should run before final active effects. */
  protected _prepareDerivedItemData (): void {
    // Base implementation - empty, subclasses override
  }

  // Active Effect Implementation from actor.mjs on version 14.354, since items don't have their own applyActiveEffects method,
  // but they do have active effects that need to be applied to themselves when prepareEmbeddedDocuments is called
  overrides: Record<string, Override[]> = {};

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
      // TODO(Phase 7): incorporate Hooks.onError pattern into LogHelper for consistency with Foundry error surfacing
      // Currently using LogHelper.error() directly to avoid hook dependency in type definitions
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
        // Only apply item-targeted changes (default to actor for compatibility with base ActiveEffect change data structure)
        const changeTarget = change.target ?? EFFECT_CHANGE_TARGET.ACTOR;
        if ( !change.key || (change.phase !== phase) || (changeTarget !== EFFECT_CHANGE_TARGET.ITEM) ) continue;
        // MASK changes are not applied via stacking — they define masked values read at prep time
        if (change.type === SYSTEM_CHANGE_TYPE.MASK) continue;
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
    // TODO(Phase 7): remove in v16, this is for backwards compatibility with older active effects
    ActiveEffect._shimChanges(changes);

    // Build StackingChange[] for the stacking engine
    const stackingChanges: StackingChange[] = changes.map((change, index) => {
      const dnd35eChange = change as unknown as Dnd35eEffectChangeData;
      const numericValue = parseNumericChangeValue(change.value);
      return {
        index,
        field: change.key,
        bonusType: dnd35eChange.bonusType,
        value: numericValue,
        source: change.effect.displayName,
        effectId: change.effect.id ?? undefined,
        isPenalty: !isNaN(numericValue) && numericValue < 0,
      };
    });

    // Resolve stacking — only numeric, typed changes participate
    const numericStackable = stackingChanges.filter(sc => !isNaN(sc.value) && sc.bonusType !== undefined);
    const { winners, history } = resolveActiveEffectChanges(numericStackable);
    const winnerIndices = new Set(winners.map((w: { changeIndex: number }) => w.changeIndex));
    const historyByIndex = new Map<number, ChangeHistory>();
    for (const h of history) historyByIndex.set(h.changeIndex, h);
    const winnerByIndex = new Map(winners.map((w: { changeIndex: number; reason: string }) => [w.changeIndex, w]));

    // Apply winning changes + all non-stackable changes (untyped or non-numeric)
    const replacementData = this.getRollData() as Record<string, unknown>;
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      const sc = stackingChanges[i];
      const isStackable = !isNaN(sc.value) && sc.bonusType !== undefined;
      const isWinner = winnerIndices.has(i);

      if (isStackable && !isWinner) {
        // Stacking loser — record in overrides but don't apply
        const historyEntry = historyByIndex.get(i);
        this.overrides[change.key] = [
          ...(this.overrides[change.key] ?? []),
          {
            fieldPath: change.key,
            value: change.value,
            effectName: change.effect.name,
            type: change.type,
            bonusType: sc.bonusType,
            stackResult: STACK_RESULT_IGNORED,
            stackReason: historyEntry?.rejection ?? 'stacking resolution',
          },
        ];
        continue;
      }

      // Apply the change (winner or non-stackable)
      const EffectClass = change.effect.constructor as typeof ActiveEffect;
      const result = (ActiveEffect.CHANGE_TYPES[change.type].handler?.(this, change)
        ?? EffectClass.applyChange(this, change, { replacementData }) ?? {}) as Record<string, unknown>;
      for (const fieldPath of Object.keys(result)) {
        const winner = isStackable ? winnerByIndex.get(i) : undefined;
        this.overrides[fieldPath] = [
          ...(this.overrides[fieldPath] ?? []),
          {
            fieldPath,
            value: change.value,
            effectName: change.effect.name,
            type: change.type,
            bonusType: sc.bonusType,
            stackResult: isStackable ? STACK_RESULT_APPLIED : undefined,
            stackReason: (winner as { reason: string } | undefined)?.reason,
          },
        ];
      }
    }
  }
  
  get localizedType (): string {
    return ITEM_TYPES_LOCALIZED[this.type] ??
      'dnd35e.COMMON.Item';
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
    const ItemClass = CONFIG.dnd35e.item.documentClasses[type] as unknown as typeof ItemDnd35e;
    // const ItemClass: typeof ItemDnd35e = CONFIG.Dnd35e.item.documentClasses[type];
    if (!ItemClass) {
      LogHelper.error(`Item type ${type} does not exist or is not properly supported for ItemProxyDnd35e`);
    }
    return new ItemClass(...args);
  },
});

export { ItemDnd35e, ItemProxyDnd35e };

export type { ItemSourceDnd35e };
