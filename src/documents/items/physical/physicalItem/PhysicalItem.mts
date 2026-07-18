import type { ActiveEffectSource } from '@client/documents/_module.mjs';
import type { DocumentConstructionContext } from '@common/_types.mjs';
import type { DatabaseUpdateCallbackOptions } from '@common/abstract/_types.mjs';
import { DocumentMixin } from '@documents/document/DocumentDnd35e.mjs';
import type { IdentifiableDocumentSourceProps } from '@documents/identifiable/IdentifiableDocument.mjs';
import { IdentifiableDocumentMixin } from '@documents/identifiable/IdentifiableDocument.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/index.mjs';
import { syncContainmentAe } from '@effects/containment/logic/containmentAe.mjs';
import { multiplyCurrency } from '@fields/currency/logic/multiply.mjs';
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
  }

  declare system: PhysicalItemSystemData;

  // ─── Lifecycle ─────────────────────────────────────────────
  static override readonly LifeCycle = {
    ...IdentifiableItemBase.LifeCycle,
    ...PhysicalItemLifeCycle,
  } as const;

  protected _buildCarriedEffectName (): string {
    return game.i18n.format('dnd35e.ITEM.carriedEffect.name', { itemName: this.name });
  }

  protected _buildCarriedChanges(): EffectChangeDataDnd35e[] {
    const results: EffectChangeDataDnd35e[] = [];
    const pushChange = (key: string, value: number): void => {
      results.push({
        key,
        target: 'actor',
        isSystem: true,
        type: 'add',
        phase: 'final',
        value,
        priority: 20,
      });
    };

    const contributedQuantity = Math.max(this.system.quantity ?? 0, 0);
    const contributedWeight = this.system.weight ?? 0;
    const totalWeight = contributedWeight * contributedQuantity;

    if (totalWeight > 0) {
      pushChange('system.encumbrance.carriedWeight', totalWeight);
    }

    const contributedValue = multiplyCurrency(this.system.price, contributedQuantity);
    if (contributedValue.srdEquivalent > 0) {
      pushChange('system.inventoryValue', contributedValue.srdEquivalent);
    }

    return results;
  }

  protected async _destroyCarriedEffect(): Promise<void> {
    const carriedEffect = this.effects.find((e) => e.name === this._buildCarriedEffectName());
    if (carriedEffect) {
      await this.deleteEmbeddedDocuments('ActiveEffect', [carriedEffect.id]);
    }
  }

  protected async _buildCarriedEffect(): Promise<void> {
    // delete previous carried effect if it exists
    await this._destroyCarriedEffect();

    // At this time we don't transfer props while in a container. that is handled differently.
    if (!!this.system.containerUuid) return;

    // create new carried effect
    await this.createEmbeddedDocuments('ActiveEffect', [
      {
        name: this._buildCarriedEffectName(),
        target: 'actor',
        type: 'general',
        system: {
          target: 'actor',
          label: this.name,
          isHidden: true,
          changes: this._buildCarriedChanges(),
          description: game.i18n.format('dnd35e.ITEM.carriedEffect.description', { itemName: this.name }),
        },
      } as Partial<ActiveEffectSource>,
    ]);
  }

  /**
   * Keeps this item's contribution AE on its container bag in sync whenever
   * the container assignment, weight, or quantity changes.
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

    if (this.system.isCarried) {
      await this._buildCarriedEffect();
    }
    else {
      await this._destroyCarriedEffect();
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
