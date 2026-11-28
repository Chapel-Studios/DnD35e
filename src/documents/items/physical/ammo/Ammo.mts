import { EFFECT_CHANGE_PHASE, EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
import type { AmmoItemType } from '@items/itemTypes.mjs';

import { PhysicalItem, type PhysicalItemSourceProps } from '../physicalItem/PhysicalItem.mjs';
import type { AmmoSystemData, AmmoSystemSource } from './data/AmmoSystemData.mjs';

type AmmoSource = Omit<foundry.documents.ItemSource, 'system'>
  & Omit<PhysicalItemSourceProps, 'system'>
  & { system: AmmoSystemSource; };

class Ammo extends PhysicalItem {
  declare system: AmmoSystemData;
  declare type: AmmoItemType;

  override getContributedActorChanges(phase: string) {
    const changes = super.getContributedActorChanges(phase);
    if (phase !== EFFECT_CHANGE_PHASE.POST) return changes;
    
    changes.push({
      isSystem: true,
      phase: EFFECT_CHANGE_PHASE.POST,
      key: 'system.attacks.ammoOptions',
      target: EFFECT_CHANGE_TARGET.ACTOR,
      type: EFFECT_CHANGE_TYPE.ADD,
      value: {
        itemUuid: this.uuid,
        name: this.name,
        ammoType: this.system.ammoType,
        quantity: this.system.quantity,
      },
      hideFromEffectsTab: true,
    });
    
    return changes;
  }
}

type AmmoType = Ammo;

export type { AmmoSource, AmmoType };
export { Ammo };
