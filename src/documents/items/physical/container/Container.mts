import type EmbeddedCollection from '@common/abstract/embedded-collection.mjs';
import { findAllContainmentAe } from '@effects/containment/logic/containmentAe.mjs';
import type { ACTIVE_EFFECTS_DND35E } from '@effects/effectTypes.mjs';
import { CurrencyData } from '@fields/index.mjs';
import type { ContainerItemType } from '@items/itemTypes.mjs';

import type { PhysicalItemLike, PhysicalItemSourceProps } from '../physicalItem/PhysicalItem.mjs';
import { PhysicalItem } from '../physicalItem/PhysicalItem.mjs';
import type { ContainerSystemData, ContainerSystemSource } from './data/ContainerSystemData.mjs';

type ContainerSource = Omit<foundry.documents.ItemSource, 'system'>
  & Omit<PhysicalItemSourceProps, 'system'>
  & { system: ContainerSystemSource; };

/**
 * Container item (backpack, bag of holding, etc.). Branches off
 * {@link PhysicalItem} — not equippable.
 *
 * Each item placed in this container pushes a contribution AE onto this
 * document. Those AEs carry `add` changes that roll up contentsWeight,
 * contentsCount, and contentsValue during the normal applyActiveEffects
 * pipeline — this class only seeds the currency base before that runs.
 *
 * The bag's own actor contribution includes contentsWeight conditionally
 * based on contentsAreWeightless — so a bag of holding contributes only its
 * physical shell weight to the carrier.
 */
class Container extends PhysicalItem {
  declare system: ContainerSystemData;
  declare type: ContainerItemType;
  declare effects: EmbeddedCollection<ACTIVE_EFFECTS_DND35E>;

  static override readonly LifeCycle = {
    ...super.LifeCycle,
    /** Contents added, removed, or changed. (Emission: future) */
    contentsChanged: 'contentsChanged',
    /** Contents weight exceeded capacity. (Emission: future) */
    wentOverCapacity: 'wentOverCapacity',
  } as const;

  /**
   * Returns all items on the owning actor whose containerUuid points at this bag.
   * The AEs on this bag are the authoritative weight record; this query is used
   * for UI display and for capacity checks.
   */
  async getContents (): Promise<PhysicalItemLike[]> {
    const itemAes = findAllContainmentAe(this);
    const results = [];
    for (const ae of itemAes) {
      if (!ae.system.sourceItemUuid) continue;
      const item = await fromUuid(ae.system.sourceItemUuid) as PhysicalItemLike | null;
      if (!item) continue;
      results.push(item);
    }
    return results;
  }

  /**
   * Synchronous version of getContents. Returns all items on the owning actor whose containerUuid points at this bag.
   * The AEs on this bag are the authoritative weight record; this query is used for UI display and for capacity checks.
   */
  getContentsSync (): PhysicalItemLike[] {
    const itemAes = findAllContainmentAe(this);
    const results = [];
    for (const ae of itemAes) {
      if (!ae.system.sourceItemUuid) continue;
      const item = fromUuidSync(ae.system.sourceItemUuid) as PhysicalItemLike | null;
      if (!item) continue;
      results.push(item);
    }
    return results;
  }

  /**
   * Seeds the contents-rollup fields with the container's own held currency
   * BEFORE final AE application. Each contained item pushes a containment AE
   * whose `add` changes (see buildContainmentChanges) layer item weight, count,
   * and value on top during applyActiveEffects(FINAL). The AE pipeline — not
   * this method — is the source of truth for contained-item contributions.
   */
  protected override _prepareDerivedItemData (): void {
    super._prepareDerivedItemData();

    const { containedCurrency } = this.system;
    this.system.contentsWeight = containedCurrency.getWeightInLbs();
    this.system.contentsCount = 0;
    this.system.contentsValue = CurrencyData.fromStacks(containedCurrency.stacks);
  }

  /**
   * Checks to see if adding an item to this container would exceed its capacity.
   * Returns false if the item would exceed maxContentWeight.
   */
  canAddItemToContents (item: PhysicalItemLike): boolean {
    const itemWeight = (item.system.weight ?? 0) * Math.max(item.system.quantity ?? 0, 0);
    const expectedNewWeight = this.system.contentsWeight + itemWeight;
    return (
      this.system.maxContentWeight === null
      || expectedNewWeight <= this.system.maxContentWeight
    );
  }
}

type ContainerType = Container;

export {
  Container,
};

export type {
  ContainerSource,
  ContainerType,
};
