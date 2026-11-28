import type { DatabaseCreateOperation } from '@common/abstract/_types.mjs';
import { syncContainmentAe } from '@effects/containment/index.mjs';
import type { PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
import type { Container } from '@items/physical/container/Container.mjs';
import { EquippableItem } from '@items/physical/equippableItem/EquippableItem.mjs';
import type { PhysicalItemLike } from '@items/physical/physicalItem/index.mjs';

import { confirmWorldContentsCopy, type ContainerCopyOptions, requireWritableContainerPack, validateContainerInsertion } from './containerContents.mjs';

export async function addItemToContainer (
  item: PHYSICAL_ITEMS,
  container: Container,
  isCarried = container.system.isCarried
): Promise<void> {
  if (container.pack) requireWritableContainerPack(container.pack);
  await validateContainerInsertion(item, container.uuid);
  if (!container.canAddItemToContents(item)) return;

  const actor = container.actor;
  const copyToActor = !!actor && item.parent?.uuid !== actor.uuid;
  const copyToPack = !actor && !!container.pack && !item.pack;
  if (copyToPack && !await confirmWorldContentsCopy(container.pack!)) return;

  const isEquipped = item instanceof EquippableItem && item.system.isEquipped;
  if (isEquipped && !item.pack) {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: 'dnd35e.ACTOR.inventory.confirmUnequipTitle' },
      content: game.i18n.format('dnd35e.ACTOR.inventory.confirmUnequipContent', { itemName: item.name }),
    });
    if (!confirmed) return;
  }

  let containedItem: PhysicalItemLike = item;
  if (copyToActor || copyToPack) {
    const data = item.toObject() as Record<string, unknown>;
    delete data._id;
    data.folder = copyToActor ? null : container._source.folder;
    foundry.utils.setProperty(data, 'system.containerUuid', null);
    foundry.utils.setProperty(data, 'system.isCarried', isCarried);
    if (item instanceof EquippableItem) {
      foundry.utils.setProperty(data, 'system.isEquipped', false);
      foundry.utils.setProperty(data, 'system.equippedSlotIds', []);
    }
    const options: Partial<DatabaseCreateOperation<null>> & ContainerCopyOptions = {
      pack: container.pack,
      containerCopiesConfirmed: copyToPack,
    };
    const created = actor
      ? await actor.createEmbeddedDocuments('Item', [data])
      : await Item.implementation.createDocuments([data as PreCreate<foundry.documents.ItemSource>], options);
    if (!created.length) return; // The contents-copy dialog may cancel creation.
    containedItem = created[0] as PhysicalItemLike;
  } else if (!item.pack) {
    if (isEquipped) await (item as EquippableItem).performUnequip();
    if (item.system.isCarried !== isCarried) await item.update({ 'system.isCarried': isCarried });
  }
  await syncContainmentAe(containedItem, container);
}
