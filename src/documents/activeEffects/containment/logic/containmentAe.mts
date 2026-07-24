import { containmentEffectType } from '@effects/containment/containmentEffectType.mjs';
import type { ActiveEffectDnd35e } from '@effects/index.mjs';
import { addCurrency, multiplyCurrency } from '@fields/currency/logic/mathOperations.mjs';
import { containerItemType, PHYSICAL_ITEM_TYPES, type PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
import type { Container } from '@items/physical/container/index.mjs';
import type { PhysicalItemLike } from '@items/physical/physicalItem/index.mjs';
import type { PriceSource } from '@settings/index.mjs';

import type { Containment } from '../Containment.mjs';
import type { ContainmentSystemSource } from '../index.mjs';

type ContainmentAeTarget = PHYSICAL_ITEMS | PhysicalItemLike;

export const containmentAeTargetTypes: readonly string[] = [
  ...PHYSICAL_ITEM_TYPES,
];

/** Returns true if `effect` is a Containment AE (item-contribution AE on a bag). */
export function isContainmentAe (effect: ActiveEffectDnd35e): boolean {
  return effect.type === containmentEffectType;
}

/**
 * Computes the weight/count/price an item contributes to its container.
 *
 * Regular items contribute `field × quantity`. Containers additionally roll up
 * their own contents so a parent container reflects everything nested inside:
 * - **weight**: the container's intrinsic shell weight (from `_source`, so it is
 *   not skewed by the containment `system.weight` change) plus `contentsWeight`
 *   (which already includes coins and deeply-nested item weight).
 * - **price**: own purchase price + `contentsValue` (coins + nested item value).
 * - **count**: the container's own quantity only — nested counts are NOT rolled
 *   up, so each container reports the number of items directly inside it.
 */
function computeItemContribution (item: ContainmentAeTarget): {
  count: number;
  weight: number;
  price: PriceSource;
} {
  const count = Math.max(item.system.quantity, 0);
  let weight = (item.system.weight ?? 0) * count;
  let price = multiplyCurrency(item.system.price, count);

  if (item.type === containerItemType) {
    const containerSystem = item.system as Container['system'];
    const shellWeight = ((item as { _source?: { system?: { weight?: number } } })
      ._source?.system?.weight ?? 0) * count;
    weight = shellWeight + (containerSystem.contentsWeight ?? 0);
    if (containerSystem.contentsValue) {
      price = addCurrency(price, containerSystem.contentsValue);
    }
  }

  return { count, weight, price };
}

/**
 * Finds the contribution AE on the bag that was pushed by the given item UUID.
 * Returns undefined if no AE for that item exists on the bag.
 */
export function findContainmentAeByItemUuid (bag: Container, itemUuid: string): Containment | undefined {
  return [...bag.effects].find(
    (e) =>
      isContainmentAe(e)
      && (e as unknown as Containment).system.sourceItemUuid === itemUuid
  ) as Containment | undefined;
}

export function findAllContainmentAe (bag: Container): Containment[] {
  return [...bag.effects].filter(
    (e) => isContainmentAe(e)
  ) as Containment[];
}

/** Builds the deterministic AE name for an item's contribution on a bag. */
export function buildContainmentAeName (itemId: string): string {
  return `item-contribution-${itemId}`;
}

/**
 * Returns true if the item is currently stowed in a container.
 * Determined by whether the item has a non-null containerUuid field.
 */
export function isItemContained (item: ContainmentAeTarget): boolean {
  return !!item.system.containerUuid;
}

/**
 * Creates, updates, or removes the contribution AE an item pushes onto its container.
 *
 * - Staying in the same container with changed weight/qty → updates AE in place.
 * - Moving to a new container → cleans up old AE, creates on new container.
 * - container = null → removes AE from any actor container.
 */
export async function syncContainmentAe (
  item: ContainmentAeTarget,
  container: Container | null
): Promise<void> {
  const { count, weight, price } = computeItemContribution(item);

  //cases
  //1 it shouldn't be in a container and isn't, do nothing
  //2 it shouldn't be in a container and is, remove it from the container
  //3 it should be in a container and isn't, add it to the container
  //4 it should be in a container and is in the wrong container, remove it from the old container and add it to the new one
  //5 it should be in a container and is in the right container, update the AE if needed

  const shouldBeInContainer = container !== null;
  const itemHasContainerUuidSet = isItemContained(item);

  /**
   * When a container's contents change, its own contribution to *its* parent
   * container is now stale. Re-sync it upward so weight/value roll up through
   * every level of nesting. No-op for containers that aren't themselves stowed.
   */
  const cascadeUpward = async (changedContainer: Container): Promise<void> => {
    const parentUuid = changedContainer.system.containerUuid;
    if (!parentUuid) return;
    const parent = await foundry.utils.fromUuid(parentUuid) as Container | null;
    if (parent) await syncContainmentAe(changedContainer, parent);
  };

  const removeFromWrongContainer = async (wrongContainer: Container): Promise<void> => {
    const ae = findContainmentAeByItemUuid(wrongContainer, item.uuid);

    if (ae) {
      await wrongContainer.deleteEmbeddedDocuments('ActiveEffect', [ae.id]);
      await cascadeUpward(wrongContainer);
    }
  };
  
  const addToContainer = async (container: Container): Promise<void> => {
    if (container.canAddItemToContents(item)) {
      await container.createEmbeddedDocuments('ActiveEffect', [{
        name: buildContainmentAeName(item.id ?? 'unknown'),
        disabled: false,
        type: containmentEffectType,
        system: {
          label: item.name,          
          sourceItemUuid: item.uuid,
          contributedWeight: weight,
          contributedCount: count,
          contributedPrice: price,
        } as Partial<ContainmentSystemSource>,
        flags: { dnd35e: { systemManaged: true } },
      } as Partial<Containment>]);

      if (item.system.containerUuid !== container.uuid) {
        await item.update({ 'system.containerUuid': container.uuid });
      }
      await cascadeUpward(container);
    }
  };

  if (shouldBeInContainer) {
    // Case 3: it should be in a container and isn't, add it to the container
    if (!itemHasContainerUuidSet) {
      await addToContainer(container);
      return;
    }
    // Case 3 End

    // Case 4: it should be in a container and is in the wrong container
    if (container.uuid !== item.system.containerUuid) {
      // Verify that the new container can accept the item before removing it from the old container.
      if (!container.canAddItemToContents(item)) {
        // todo: move this to a foundry warning
        console.warn(`Cannot move item ${item.name} to container ${container.name}: would exceed capacity.`);
        return;
      }
      // remove it from the old container and add it to the new one
      const wrongContainer = await foundry.utils.fromUuid(item.system.containerUuid!) as Container | null;
      if (wrongContainer) {
        await removeFromWrongContainer(wrongContainer);
      }
      await addToContainer(container);
      return;
    }
    // Case 4 End

    // Case 5: it should be in a container and is in the right container,
    // update the AE if needed
    const existing = findContainmentAeByItemUuid(container, item.uuid);
    const existingStacks = existing?.system.contributedPrice?.stacks ?? [];
    const haveStacksChanged = existing?.system.contributedPrice?.stacks?.length !== price.stacks.length
      || existingStacks.some((s, i) => s.coinId !== price.stacks[i]?.coinId || s.count !== price.stacks[i]?.count);
    if (
      existing
      && (
        existing.system.contributedWeight !== weight
        || existing.system.contributedCount !== count
        || haveStacksChanged
      )
    ) {
      await existing.update({ system: {
        contributedWeight: weight,
        contributedCount: count,
        contributedPrice: price,
      } });
      await cascadeUpward(container);
    }
    // Case 5 End
  }
  else { // aka shouldn't be in a container
    // Case 1: it shouldn't be in a container and isn't, do nothing
    if (!itemHasContainerUuidSet) return;
    // Case 1 End

    // Case 2: it shouldn't be in a container and is, remove it from the container
    const wrongContainer = await foundry.utils.fromUuid(item.system.containerUuid!) as Container | null;
    if (wrongContainer) await removeFromWrongContainer(wrongContainer);

    await item.update({ 'system.containerUuid': null });
    // Case 2 End
  }
}
