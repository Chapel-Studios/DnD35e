import type { DestroyedEventPayload } from '@documents/document/events/destroyed.mjs';
import type { PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
import type { Container } from '@items/physical/container/index.mjs';

import { findContainmentAeByItemUuid } from './containmentAe.mjs';

/**
 * When a physical item is destroyed, remove its contribution AE from the bag
 * it was stowed in (if any).
 */
const checkForContainerOnItemDestroy = async (
  destroyedItem: DestroyedEventPayload<PHYSICAL_ITEMS>
): Promise<void> => {
  const item = destroyedItem.document;
  const containerUuid = (item.system as { containerUuid?: string | null }).containerUuid;
  if (!containerUuid) return;

  const container = foundry.utils.fromUuidSync(containerUuid) as Container | null;
  if (!container) return;

  const contributionAe = findContainmentAeByItemUuid(container, item.uuid);
  if (contributionAe) await contributionAe.delete();
};

export {
  checkForContainerOnItemDestroy,
};
