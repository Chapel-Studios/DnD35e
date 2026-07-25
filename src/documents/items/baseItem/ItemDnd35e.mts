import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { DeepPartial, DocumentConstructionContext } from '@common/_types.mjs';
import type { DatabaseCreateCallbackOptions } from '@common/abstract/_types.mjs';
import type EmbeddedCollection from '@common/abstract/embedded-collection.mjs';
import type { DocumentUpdateCallbackOptions } from '@documents/document/DocumentDnd35e.mjs';
import { DocumentLifeCycle } from '@documents/document/events/DocumentLifeCycle.mjs';
import type { NameFormulaDocument } from '@documents/document/logic/index.mjs';
import { ensureNameFormulaOnCreate, getDisplayName } from '@documents/document/logic/index.mjs';
import type { ActiveEffectDnd35e } from '@effects/baseActiveEffect/ActiveEffectDnd35e.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import {
  EFFECT_CHANGE_TARGET,
  EFFECT_CHANGE_TYPE,
  FINAL_EFFECT_CHANGE_PHASE,
  INITIAL_EFFECT_CHANGE_PHASE,
  SYSTEM_CHANGE_TYPE,
} from '@effects/baseActiveEffect/data/constants.mjs';
import type { ResolvedEffectChange } from '@effects/baseActiveEffect/logic/applyStackedChanges.mjs';
import { applyStackedActiveEffectChanges } from '@effects/baseActiveEffect/logic/applyStackedChanges.mjs';
import { resolveActiveEffectChange, resolveMaskedActiveEffectChangeValue } from '@effects/baseActiveEffect/logic/resolveChangeValue.mjs';
import type { ACTIVE_EFFECTS_DND35E } from '@effects/effectTypes.mjs';
import { secretEffectType } from '@effects/secret/secretEffectType.mjs';
import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import { LogHelper } from '@helpers/LogHelper.mjs';
import type { Override } from '@helpers/stacking.mjs';
import type { ItemType } from '@items/index.mjs';
import { ITEM_TYPES_LOCALIZED } from '@items/itemTypes.mjs';

import type { ItemSheetStore, ItemSystemData, ItemSystemSource } from './index.mjs';

type FormulaLikeSource = {
  formula?: unknown;
  resolvedValue?: unknown;
  expectedType?: unknown;
};

type ItemSourceDnd35e<TItemType extends ItemType = ItemType> = foundry.documents.ItemSource<TItemType, ItemSystemSource>;

// dnd35e type-fix: fixed non-null 'Actor' type argument (instead of TParent/this or a
// dropped/defaulted argument) breaks circular assignability when checking subclasses
// (e.g. this class's own subtypes) against foundry.documents.Item, while still satisfying
// EmbeddedCollection's requirement that embedded elements have a non-null parent.
class ItemDnd35e<TItemType extends ItemType = ItemType, TParent extends ActorDnd35e | null = ActorDnd35e | null> extends foundry.documents.Item<foundry.documents.Actor> {
  constructor(source: PreCreate<ItemSourceDnd35e<TItemType>>, context?: DocumentConstructionContext<TParent>) {
    super(source, context);
    this._completedActiveEffectPhases = new Set();
  }
  declare readonly effects: EmbeddedCollection<ACTIVE_EFFECTS_DND35E>;
  declare type: TItemType;
  declare system: ItemSystemData;
  declare _source: ItemSourceDnd35e<TItemType>;
  // declare _sheet: ItemSheetDnd35e<any> | null;

  // dnd35e type-fix: base's "actor" resolves to the FIXED `foundry.documents.Actor`
  // argument used to break the extends-clause circularity above. Overriding it to return
  // this class's own (nullable) `TParent` is NOT possible — TypeScript's covariant-override
  // rule rejects widening a non-null base return type to include `null`, and re-declaring
  // "parent" itself reintroduces excessive-depth circularity via DataModel's parent-typed
  // construction context. `TParent` is therefore decorative for "actor"/"parent" purposes;
  // consuming code that needs the narrower dnd35e actor type should cast explicitly.

  /** Life Cycle */
  static readonly LifeCycle = {
    // This sadly doesn't properly inherit this from the Mixin
    ...DocumentLifeCycle,
  } as const;

  protected override async _preCreate(
    updateData: DeepPartial<this['_source']>,
    options: DatabaseCreateCallbackOptions,
    user: foundry.documents.BaseUser
  ): Promise<boolean> {
    const precreateResult = await super._preCreate(updateData, options, user);
    if (precreateResult === false) return false;

    await ensureNameFormulaOnCreate(this as unknown as NameFormulaDocument);
    return true;
  } 

  protected override async _onUpdate(
    data: Record<string, unknown>,
    options: DocumentUpdateCallbackOptions,
    userId: string
  ): Promise<void> {
    super._onUpdate(data, options, userId);
    
    // ensure sheetstore updates
    if (game.dnd35e?.stores?.[this.documentName]?.[this.uuid]) {
      (game.dnd35e.stores[this.documentName]?.[this.uuid] as ItemSheetStore<any>)
        ?._storeUtils.refreshDocument?.(this);
    }

    // ensure parent sheetstore updates if this is an embedded item
    if (this.parent && game.dnd35e?.stores?.[this.parent.documentName]?.[this.parent.uuid]) {
      (game.dnd35e.stores[this.parent.documentName]?.[this.parent.uuid] as ItemSheetStore<any>)
        ?._storeUtils.refreshDocument?.(this.parent);
    }
  }

  // Active Effect Implementation from actor.mjs on version 14.354, since items don't have their own applyActiveEffects method,
  // but they do have active effects that need to be applied to themselves when prepareEmbeddedDocuments is called
  // Example:
  // {
  //    "system.ability": {
  //      fieldPath: string;
  //      value: unknown;
  //      effectName: string;
  //      type: EffectChangeType;
  //      bonusType?: BonusType;
  //      stackResult?: StackResult;
  //      stackReason?: string;
  //    }[];
  // }
  effectOverrides: Record<string, Override[]> = {};

  _completedActiveEffectPhases: Set<string>;

  /** Runtime masks dictionary built from active Secret AE MASK changes. Keyed by field path. */
  _masks: Record<string, unknown> = {};

  private get _maskedNameFormula (): { formula: string; resolvedValue: string | number | null; expectedType: 'string' | 'number' } | null {
    const directMask = this._masks['system.nameFormula'] as FormulaLikeSource | undefined;
    if (directMask && typeof directMask === 'object') {
      const formula = typeof directMask.formula === 'string' ? directMask.formula : null;
      const resolvedValue = typeof directMask.resolvedValue === 'string' || typeof directMask.resolvedValue === 'number'
        ? String(directMask.resolvedValue)
        : null;
      if (formula || resolvedValue) {
        const effectiveText = resolvedValue ?? formula ?? '';
        return FormulaData.toSource(formula ?? effectiveText, {
          resolvedValue: effectiveText,
          expectedType: 'string',
        });
      }
    }

    const formulaMask = typeof this._masks['system.nameFormula.formula'] === 'string'
      ? this._masks['system.nameFormula.formula']
      : null;
    const resolvedMask = typeof this._masks['system.nameFormula.resolvedValue'] === 'string'
      ? this._masks['system.nameFormula.resolvedValue']
      : null;
    const nameMask = typeof this._masks.name === 'string'
      ? this._masks.name
      : null;

    const effectiveText = resolvedMask ?? formulaMask ?? nameMask;
    if (!effectiveText) return null;

    return FormulaData.toSource(formulaMask ?? effectiveText, {
      resolvedValue: resolvedMask ?? effectiveText,
      expectedType: 'string',
    });
  }

  private _normalizeSpecialMasks (): void {
    const maskedNameFormula = this._maskedNameFormula;
    if (!maskedNameFormula) return;

    this._masks['system.nameFormula'] = maskedNameFormula;
    this._masks['system.nameFormula.formula'] = maskedNameFormula.formula;
    this._masks['system.nameFormula.resolvedValue'] = maskedNameFormula.resolvedValue;
    this._masks.name = maskedNameFormula.resolvedValue ?? maskedNameFormula.formula;
  }

  private _getMaskedTopLevelField<T extends string> (fieldPath: 'name' | 'img', rawValue: T, fallbackValue: T): T {
    const identifiableState = this as unknown as { isIdentified?: boolean };
    const baseValue = rawValue ?? fallbackValue;
    if (identifiableState.isIdentified !== false) {
      return baseValue;
    }

    const maskedValue = this._masks?.[fieldPath];
    if (maskedValue === undefined || maskedValue === null) {
      return baseValue;
    }

    return typeof maskedValue === 'string' ? maskedValue as T : baseValue;
  }

  override prepareBaseData (): void {
    super.prepareBaseData();
    this._completedActiveEffectPhases = new Set();
    this.effectOverrides = {};
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
   * Per-change priority resolution: highest priority wins per field path.
   */
  private _buildMasks (): void {
    this._masks = {};
    const maskCandidates: Array<{ key: string; value: unknown; priority: number }> = [];
    for (const effect of this.effects) {
      if (effect.type !== secretEffectType || !effect.active) continue;
      for (const change of effect.system.changes) {
        if (change.type !== SYSTEM_CHANGE_TYPE.MASK) continue;
        if (!change.key) continue;
        maskCandidates.push({
          key: change.key,
          value: resolveMaskedActiveEffectChangeValue(effect, change),
          priority: change.priority ?? 0,
        });
      }
    }
    // Sort descending by priority — highest priority first
    maskCandidates.sort((a, b) => b.priority - a.priority);
    for (const { key, value } of maskCandidates) {
      if (key in this._masks) continue;
      this._masks[key] = value;
    }
    this._normalizeSpecialMasks();
  }

  /** Override this in subclasses for derived data calculations that should run before final active effects. */
  protected _prepareDerivedItemData (): void {
    // Base implementation - empty, subclasses override
  }

  /**
   * Get all ActiveEffects that have item-targeted changes.
   * Effects can have both item and actor targeted changes - we yield any effect
   * that has at least one item-targeted change.
   */
  *allApplicableEffects() {
    for (const effect of this.effects) {
      if (effect.hasItemChanges) yield effect as ActiveEffectDnd35e;
    }
  }

  /**
   * Live, actor-targeted changes this item contributes with no backing ActiveEffect
   * document at all - e.g. carried-weight (`PhysicalItem`) or equipped-status
   * (`EquippableItem`) contributions. Recomputed fresh from this item's own current
   * system data on every call (called from `ActorDnd35e.applyActiveEffects()` each
   * preparation cycle) - never persisted, so there is no document to create, toggle, or
   * delete, and therefore no create/delete churn, no ID, and no race to guard against.
   * Base implementation returns none; overridden by subclasses that need this.
   */
  getContributedActorChanges(_phase: string): EffectChangeDataDnd35e[] {
    return [];
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

    type AppliedItemEffectChange = ResolvedEffectChange;
    const changes: AppliedItemEffectChange[] = [];
    for ( const effect of this.allApplicableEffects() ) {
      if ( !effect.active ) continue;
      for ( const change of effect.system.changes ) {
        // default to actor for compatibility with vanilla ActiveEffect change data structure
        const changeTarget = change.target ?? EFFECT_CHANGE_TARGET.ACTOR;
        if (
          // Only apply item-targeted changes
          (
            !change.key 
            || (change.phase !== phase) 
            || (changeTarget !== EFFECT_CHANGE_TARGET.ITEM)
          )
          // MASK changes are not applied via stacking — they define masked values read at prep time
          || (change.type === SYSTEM_CHANGE_TYPE.MASK)
          || (
            change.condition
            && (
              (
                typeof change.condition === 'function'
                && !change.condition(this)
              )
              //TODO implement after the fomrula deep dive
              // || (
              //   typeof change.condition === 'string'
              //   && !FormulaData.evaluateFormula(change.condition, this.getRollData())
              // )
            )
          )
        ) continue;
        const copy = foundry.utils.deepClone(resolveActiveEffectChange(effect, change)) as unknown as AppliedItemEffectChange;
        copy.effect = effect;
        copy.type ??= EFFECT_CHANGE_TYPE.ADD;
        copy.priority ??= 0;
        copy.label ??= effect.system.label ?? effect.name;
        changes.push(copy);
      }
      // Not sure how statuses should interact with item active effects, since they don't have tokens,
      // but we'll keep this here for now in case we want to add some sort of status effect functionality to items in the future.
      // if ( phase === 'initial' ) {
      //   for ( const statusId of effect.statuses ) this.statuses.add(statusId);
      // }
    }
    changes.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    // Resolve bonus-type stacking and apply the winners, recording Override
    // history for every field touched (shared with ActorDnd35e.applyActiveEffects).
    applyStackedActiveEffectChanges(this, changes);
  }
  
  get localizedType (): string {
    return ITEM_TYPES_LOCALIZED[this.type] ??
      'dnd35e.COMMON.Item';
  }

  override get name (): string {
    const fallbackName = (this._source?.name ?? '') as string;
    return getDisplayName(fallbackName, this.system, this);
  }

  override get img (): foundry.documents.Item['img'] {
    const fallbackImg = super.img;
    return this._getMaskedTopLevelField('img', super.img, fallbackImg);
  }

  get _displayName (): string {
    const fallbackName = (this._source?.name ?? '') as string;
    return getDisplayName(fallbackName, this.system, this);
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
