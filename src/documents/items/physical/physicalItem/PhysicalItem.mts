import type { DocumentConstructionContext } from '@common/_types.mjs';
import type { DatabaseUpdateCallbackOptions } from '@common/abstract/_types.mjs';
import { DocumentMixin } from '@documents/document/DocumentDnd35e.mjs';
import type { IdentifiableDocumentSourceProps } from '@documents/identifiable/IdentifiableDocument.mjs';
import { IdentifiableDocumentMixin } from '@documents/identifiable/IdentifiableDocument.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/index.mjs';
import { INITIAL_EFFECT_CHANGE_PHASE } from '@effects/baseActiveEffect/index.mjs';
import { syncContainmentAe } from '@effects/containment/logic/containmentAe.mjs';
import { multiplyCurrency } from '@fields/currency/logic/mathOperations.mjs';
import type { ItemDnd35e, ItemSourceDnd35e } from '@items/baseItem/index.mjs';
import { ItemDnd35e as ItemDnd35eClass } from '@items/baseItem/ItemDnd35e.mjs';
import type { ItemType } from '@items/index.mjs';

import type { Container } from '../container/Container.mjs';
import type { PhysicalItemSystemData, PhysicalItemSystemSource } from './data/PhysicalItemSystemData.mjs';
import { registerPhysicalItemEventChecks } from './events/index.mjs';
import { PhysicalItemLifeCycle } from './events/PhysicalItemLifeCycle.mjs';
import { registerPhysicalItemEvents } from './events/registerPhysicalItemEvents.mjs';

type PhysicalItemSourceProps = {
  system: PhysicalItemSystemSource;
};

type PhysicalItemSource<TItemType extends ItemType = ItemType> =
  Omit<ItemSourceDnd35e<TItemType>, 'system'>
    & IdentifiableDocumentSourceProps
    & PhysicalItemSourceProps;

// ─── Pre-composed mixin base ────────────────────────────────────────────────
/** ItemDnd35e → DocumentMixin → IdentifiableDocumentMixin */
const IdentifiableItemBase = IdentifiableDocumentMixin(DocumentMixin(ItemDnd35eClass));

// ─── Abstract class layer ───────────────────────────────────────────────────

/**
 * Abstract base for all physical (tangible) items.
 * Sits on top of the identifiable mixin chain and provides default
 * formula context builders that concrete subclasses can override.
 */
abstract class PhysicalItem extends IdentifiableItemBase {
  constructor(source: PreCreate<PhysicalItemSource>, context?: DocumentConstructionContext<null>) {
    super(source as any, context);

    registerPhysicalItemEventChecks(this);

    // syncContainmentAe() is otherwise only refreshed from _onUpdate() (weight/quantity/
    // price/containerUuid changes). Newly created items would never get their containment
    // contribution AE built until an unrelated later edit - so build it once here too.
    // (Carried-weight contribution no longer needs any such bootstrap at all - it's
    // computed live every preparation cycle by `getContributedActorChanges()`, not
    // persisted anywhere.)
    this.events.once(PhysicalItem.LifeCycle.created, () => {
      void this._onPhysicalItemCreated();
    });
  }

  private async _onPhysicalItemCreated(): Promise<void> {
    if (this.system.containerUuid) {
      const targetContainer = await foundry.utils.fromUuid(this.system.containerUuid) as Container;
      await syncContainmentAe(this, targetContainer);
    }
  }

  declare system: PhysicalItemSystemData;

  // ─── Lifecycle ─────────────────────────────────────────────
  static override readonly LifeCycle = {
    ...IdentifiableItemBase.LifeCycle,
    ...PhysicalItemLifeCycle,
  } as const;

  /**
   * Weight/value contributed by carried items must apply in the 'initial' phase (not
   * 'final') - the Creature's encumbrance tier is computed during `prepareDerivedData()`,
   * which runs between the 'initial' and 'final' phases. Applying these changes any
   * later would leave `carriedWeight` (and therefore `tier`) one cycle stale, and would
   * make it impossible for tier-based Active Effects (e.g. encumbrance penalties) to
   * react to the current pass's tier during 'final'.
   */
  protected _buildPhysicalChanges(): EffectChangeDataDnd35e[] {
    const results: EffectChangeDataDnd35e[] = [];
    const pushChange = (key: string, value: number): void => {
      results.push({
        key,
        target: 'actor',
        isSystem: true,
        type: 'add',
        phase: INITIAL_EFFECT_CHANGE_PHASE,
        value,
        priority: 20,
      });
    };

    const contributedQuantity = Math.max(this.system.quantity ?? 0, 0);
    const contributedValue = multiplyCurrency(this.system.price, contributedQuantity);

    if (contributedValue.srdEquivalent > 0) {
      pushChange('system.inventoryValue', contributedValue.srdEquivalent);
    }
    
    const contributedWeight = this.system.weight ?? 0;
    const totalWeight = contributedWeight * contributedQuantity;

    if (totalWeight > 0 && this.system.isCarried) {
      pushChange('system.encumbrance.carriedWeight', totalWeight);
    }


    return results;
  }

  /**
   * Live actor-targeted changes this item contributes while carried - see
   * `ItemDnd35e.getContributedActorChanges()`. Computed fresh from current isCarried/
   * weight/quantity/price/containerUuid state every call; nothing is persisted, so there
   * is no AE document to create, toggle, or delete for this, and no churn/ID/race to
   * worry about. At this time we don't transfer props while in a container - that is
   * handled separately, by containment's own item-to-container AE.
   */
  override getContributedActorChanges(phase: string): EffectChangeDataDnd35e[] {
    if (this.system.containerUuid) return [];
    return this._buildPhysicalChanges().filter((change) => change.phase === phase);
  }

  /**
   * Keeps this item's contribution AE on its container bag in sync whenever
   * the container assignment, weight, quantity, or price changes.
   */
  protected override async _onUpdate (
    changed: Record<string, unknown>,
    options: DatabaseUpdateCallbackOptions,
    userId: string
  ): Promise<void> {
    await super._onUpdate(changed, options, userId);

    const changedSystem = changed.system as Partial<PhysicalItemSystemData> | undefined;
    if (!changedSystem) return;

    // containment logic
    const hasContainerChanged = 'containerUuid' in changedSystem;
    const containerAlreadyExists = !!this.system.containerUuid;
    const hasKeyValueChanged = 
      'weight' in changedSystem
      || 'quantity' in changedSystem
      || 'price' in changedSystem;

    if (
      hasContainerChanged
      || (hasKeyValueChanged && containerAlreadyExists)
    ) {
      const containerUuid = this.system.containerUuid;
      const targetContainer = containerUuid
        ? await foundry.utils.fromUuid(containerUuid) as Container
        : null;
        
      await syncContainmentAe(this, targetContainer);
    }
  }
}

registerPhysicalItemEvents();

type PhysicalItemLike = ItemDnd35e<ItemType> & PhysicalItem;

export {
  IdentifiableItemBase,
  PhysicalItem,
};

export type {
  PhysicalItemLike,
  PhysicalItemSource,
  PhysicalItemSourceProps,
};
