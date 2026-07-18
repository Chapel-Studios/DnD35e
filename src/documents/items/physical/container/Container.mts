import type EmbeddedCollection from '@common/abstract/embedded-collection.mjs';
import { findAllContainmentAe } from '@effects/containment/logic/containmentAe.mjs';
import type { ACTIVE_EFFECTS_DND35E } from '@effects/effectTypes.mjs';
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
 * document. This bag reads those AEs in prepareDerivedData to compute
 * contentsWeight and contentsCount without polling items each cycle.
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
   * Sums weight and count from item-contribution AEs pushed onto this bag.
   * Item weights are never zeroed here — the bag's actor contribution handles
   * the weightless flag so item sheets always show true item weight.
   */
  override prepareDerivedData (): void {
    super.prepareDerivedData();

    this.system.isOverCapacity = this.system.maxContentWeight !== null
      && this.system.contentsWeight > this.system.maxContentWeight;
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
