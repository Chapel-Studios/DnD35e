import { containmentEffectType } from '@effects/containment/containmentEffectType.mjs';
import { multiplyCurrency } from '@fields/currency/logic/multiply.mjs';
import type { PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
import type { Container } from '@items/physical/container/index.mjs';
import type { PhysicalItemLike } from '@items/physical/physicalItem/index.mjs';
import type { PriceSource } from '@settings/index.mjs';

import type { Containment } from '../Containment.mjs';

type ContainmentAeTarget = PHYSICAL_ITEMS | PhysicalItemLike;

/** Returns true if `effect` is a Containment AE (item-contribution AE on a bag). */
export function isContainmentAe (effect: ActiveEffect): boolean {
  return effect.type === containmentEffectType;
}

/**
 * Finds the contribution AE on the bag that was pushed by the given item UUID.
 * Returns undefined if no AE for that item exists on the bag.
 */
export function findContainmentAe (bag: Container, itemUuid: string): Containment | undefined {
  return [...bag.effects].find(
    (e) =>
      isContainmentAe(e as unknown as ActiveEffect)
      && (e as unknown as Containment).system.sourceItemUuid === itemUuid
  ) as Containment | undefined;
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
 *
 * Should only be invoked by the active GM to avoid duplicate writes.
 */
export async function syncContainmentAe (
  item: ContainmentAeTarget,
  container: Container | null
): Promise<void> {
  const count = Math.max(item.system.quantity, 0);
  const weight = (item.system.weight ?? 0) * count;
  const price: PriceSource = multiplyCurrency(item.system.price, count);

  //cases
  //1 it shouldn't be in a container and isn't, do nothing
  //2 it shouldn't be in a container and is, remove it from the container
  //3 it should be in a container and isn't, add it to the container
  //4 it should be in a container and is in the wrong container, remove it from the old container and add it to the new one
  //5 it should be in a container and is in the right container, update the AE if needed

  const shouldBeInContainer = container !== null;
  const itemHasContainerUuidSet = isItemContained(item);

  const removeFromWrongContainer = async (wrongContainer: Container): Promise<void> => {
    if (wrongContainer) {
      const ae = findContainmentAe(wrongContainer, item.uuid);
      
      if (ae) {
        await wrongContainer.deleteEmbeddedDocuments('ActiveEffect', [ae.id]);
      }
    }
  };
  
  const addToContainer = async (container: Container): Promise<void> => {
    if (container.canAddItemToContents(item)) {
      await container.createEmbeddedDocuments('ActiveEffect', [{
        name: buildContainmentAeName(item.name ?? item.id ?? 'unknown'),
        disabled: false,
        system: {
          sourceItemUuid: item.uuid,
          contributedWeight: weight,
          contributedCount: count,
          contributedPrice: price,
        },
        flags: { dnd35e: { systemManaged: true } },
      }]);
      await item.update({ 'system.containerUuid': container.uuid });
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
    const existing = findContainmentAe(container, item.uuid);
    if (
      existing
      && (
        existing.system.contributedWeight !== weight
        || existing.system.contributedCount !== count
        || existing.system.contributedPrice?.stacks !== price.stacks
      )
    ) {
      await existing.update({ system: {
        contributedWeight: weight,
        contributedCount: count,
        contributedPrice: price,
      } });
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

    await item.update({ 'system.containerUuid': '' });
    // Case 2 End
  }

  // old way
  // // If item is staying in the same bag, update in place and return early.
  // if (container?.uuid === item.system.containerUuid) {
  //   const existing = findContainmentAe(container, item.uuid);
  //   if (existing) {
  //     if (
  //       existing.system.contributedWeight !== weight
  //       || existing.system.contributedCount !== count
  //       || existing.system.contributedPrice?.stacks !== price.stacks
  //     ) {
  //       await existing.update({ system: {
  //         contributedWeight: weight,
  //         contributedCount: count,
  //         contributedPrice: price,
  //       } });
  //     }
  //     return;
  //   }
  // }

  // // Clean up any stale contribution AE for this item from any actor container.
  // const actor = (item as unknown as { actor?: { items?: Iterable<unknown> } | null }).actor;
  // if (actor?.items) {
  //   for (const actorItem of actor.items) {
  //     if ((actorItem as { type?: string }).type !== containerItemType) continue;
  //     const staleAe = findContainmentAe(actorItem as unknown as Container, item.uuid);
  //     if (staleAe) await staleAe.delete();
  //   }
  // }

  // if (!container || container.id === null) return;

  // await container.createEmbeddedDocuments('ActiveEffect', [{
  //   name: buildContainmentAeName(item.id ?? 'unknown'),
  //   type: containmentEffectType,
  //   disabled: false,
  //   system: {
  //     sourceItemUuid: item.uuid,
  //     contributedWeight: weight,
  //     contributedCount: count,
  //   },
  //   flags: { dnd35e: { systemManaged: true } },
  // }]);
}

// Module-level hook: remove contribution AE from the bag when the contributing item is deleted.
Hooks.on('deleteItem', async (item: { system?: { containerUuid?: string | null }; uuid: string }) => {
  if (!game.user.isActiveGM) return;
  const containerUuid = item.system?.containerUuid;
  if (!containerUuid) return;
  const container = foundry.utils.fromUuidSync(containerUuid) as Container | null;
  if (!container) return;
  const ae = findContainmentAe(container, item.uuid);
  if (ae) await ae.delete();
});
