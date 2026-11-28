import type { DocumentConstructionContext } from '@common/_types.mjs';
import { DocumentLifeCycle } from '@documents/document/events/DocumentLifeCycle.mjs';
import { ActiveEffectDnd35e } from '@effects/baseActiveEffect/ActiveEffectDnd35e.mjs';
import type { PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
import { Container } from '@items/physical/container/Container.mjs';

import { containmentEffectType } from './containmentEffectType.mjs';
import type { ContainmentSystemData, ContainmentSystemSource } from './data/index.mjs';
import { removeContainmentReference } from './logic/containmentAe.mjs';
import { registerContainmentReference } from './logic/containmentReferences.mjs';

type ContainmentEffectType = typeof containmentEffectType;

type ContainmentSource = foundry.documents.ActiveEffectSource<
  ContainmentEffectType,
  ContainmentSystemSource
>;

interface ContainmentEffectFlags {}

/**
 * Document class for the item-contribution AE placed on a container bag.
 * Each contained item pushes one of these onto its bag; the bag reads them
 * in prepareDerivedData to compute contentsWeight and contentsCount.
 */
class Containment extends ActiveEffectDnd35e {
  constructor(
    data: PreCreate<ContainmentSource>,
    context?: DocumentConstructionContext<Containment['parent']>
  ) {
    super(data, context);
    if (this.system.sourceItemUuid?.startsWith('Compendium.')) {
      if (context && 'creation' in context && context.creation === true) return;
      const subscription = registerContainmentReference(this);
      this.events.once(DocumentLifeCycle.destroyed, () => subscription.cancel());
      return;
    }
    void (async () => {
      const item = this.system.sourceItemUuid
        ? await fromUuid(this.system.sourceItemUuid) as PHYSICAL_ITEMS
        : null;
      if (!item) return;
      const container = this.parent as Container;
      const offContainer = container?.events?.once?.(Container.LifeCycle.destroyed, async () => {
        offItem?.cancel();
        if (!item.pack && item.system.containerUuid === container.uuid) {
          await item.update({ 'system.containerUuid': null });
        }
      });
      const offItem = item.events?.once?.(DocumentLifeCycle.destroyed, async () => {
        await removeContainmentReference(item, container);
      });
      this.events.once(DocumentLifeCycle.destroyed, () => {
        offContainer?.cancel();
        offItem?.cancel();
      });
    })();
  }
  
  declare type: ContainmentEffectType;
  declare system: ContainmentSystemData;
}

type ContainmentType = Containment;

export { Containment, containmentEffectType };

export type {
  ContainmentEffectFlags,
  ContainmentEffectType,
  ContainmentSource,
  ContainmentType,
};
