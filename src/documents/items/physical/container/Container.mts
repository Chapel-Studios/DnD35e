import type EmbeddedCollection from '@common/abstract/embedded-collection.mjs';
import { findAllContainmentAe, findContainmentAeByItemUuid } from '@effects/containment/logic/containmentAe.mjs';
import type { ACTIVE_EFFECTS_DND35E } from '@effects/effectTypes.mjs';
import { CurrencyData } from '@fields/index.mjs';
import type { ContainerItemType, PHYSICAL_ITEMS } from '@items/itemTypes.mjs';

import type { PhysicalItemLike, PhysicalItemSourceProps } from '../physicalItem/PhysicalItem.mjs';
import { PhysicalItem } from '../physicalItem/PhysicalItem.mjs';
import { CONTAINER_TYPE } from './data/constants.mjs';
import type { ContainerSystemData, ContainerSystemSource } from './data/ContainerSystemData.mjs';
import { getItemAllowedMsg } from './logic/filterItems.mjs';

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
   * Resolves world, actor-owned, or compendium items referenced by this bag's containment AEs.
   * AE membership is authoritative for both contents display and weight rollups.
   */
  async getContents (): Promise<PHYSICAL_ITEMS[]> {
    const itemAes = findAllContainmentAe(this);
    const results = [];
    for (const ae of itemAes) {
      if (!ae.system.sourceItemUuid) continue;
      const item = await fromUuid<PHYSICAL_ITEMS>(ae.system.sourceItemUuid);
      if (!item) continue;
      results.push(item);
    }
    return results;
  }

  /**
   * Resolves already-loaded contents; use getContents() to load compendium documents.
   */
  getContentsSync (): PhysicalItemLike[] {
    const itemAes = findAllContainmentAe(this);
    const results = [];
    for (const ae of itemAes) {
      if (!ae.system.sourceItemUuid) continue;
      const item = fromUuidSync(ae.system.sourceItemUuid) as PhysicalItemLike | null;
      if (!item) continue;
      if (!(item instanceof PhysicalItem)) {
        throw new Error(`Container contents ${ae.system.sourceItemUuid} are not loaded; use getContents().`);
      }
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

    const containedCurrency = this.system.allowsCurrency
      ? this.system.containedCurrency
      : null;
    this.system.contentsWeight = containedCurrency?.getWeightInLbs() ?? 0;
    this.system.contentsCount = 0;
    this.system.contentsValue = containedCurrency
      ? CurrencyData.fromStacks(containedCurrency.stacks)
      : new CurrencyData();
  }

  /**
   * Checks purse, type/subtype, and capacity restrictions before changing contents.
   */
  canAddItemToContents (item: PhysicalItemLike): boolean {
    if (this.system.containerType === CONTAINER_TYPE.PURSE) {
      ui.notifications.warn(game.i18n.localize('dnd35e.CONTAINER.warnings.noItemsInPurse'));
      return false;
    }

    const itemNotAllowedMsg = getItemAllowedMsg(item, this.system.allowedItemTypes, this.system.allowedItemSubtypes);
    if (itemNotAllowedMsg) {
      ui.notifications.warn(itemNotAllowedMsg);
      return false;
    }

    const itemWeight = (item.system.weight ?? 0) * Math.max(item.system.quantity ?? 0, 0);
    const existingWeight = findContainmentAeByItemUuid(this, item.uuid)?.system.contributedWeight ?? 0;
    const expectedNewWeight = this.system.contentsWeight - existingWeight + itemWeight;
    const result = (
      this.system.maxContentWeight === null
      || expectedNewWeight <= this.system.maxContentWeight
    );
    if (!result) {
      ui.notifications.warn(game.i18n.format('dnd35e.CONTAINER.warnings.tooHeavy', {
        limit: this.system.maxContentWeight,
      }));
    }
    return result;
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
