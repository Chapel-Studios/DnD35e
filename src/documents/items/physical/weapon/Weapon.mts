import type { EquipSlot } from '@constants/equipmentSlots.mjs';
import { MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT } from '@constants/equipmentSlots.mjs';
import type { WeaponItemType } from '@items/itemTypes.mjs';
import { EquippableItem } from '@items/physical/equippableItem/index.mjs';

import type { PhysicalItemSourceProps } from '../physicalItem/PhysicalItem.mjs';
import { WEAPON_SUBTYPE } from './data/constants.mjs';
import type { WeaponSystemData, WeaponSystemSource } from './data/WeaponSystemData.mjs';

type WeaponSource = Omit<foundry.documents.ItemSource, 'system'>
  & Omit<PhysicalItemSourceProps, 'system'>
  & { system: WeaponSystemSource; };

class Weapon extends EquippableItem {
  declare system: WeaponSystemData;
  declare type: WeaponItemType;

  /**
   * Lifecycle events for weapons. Extends physical item events with
   * weapon-specific combat events.
   *
   * Emission points for action events land in alpha Phase 3 (Action System).
   *
   * Usage:
   *   weapon.events.on(Weapon.LifeCycle.onHit, ({ target, damage }) => { ... });
   */
  // TODO these need to be put in traditional lifecycle event files after the combat system is implemented
  static override readonly LifeCycle = {
    ...super.LifeCycle,
    /** Before a weapon action executes. Allows cancellation. (Emission: alpha Phase 3) */
    beforeAction: 'beforeAction',
    /** After a weapon action completes successfully. (Emission: alpha Phase 3) */
    afterAction: 'afterAction',
    /** Weapon lands a hit on a target. (Emission: alpha Phase 3) */
    onHit: 'onHit',
    /** Weapon scores a critical hit. (Emission: alpha Phase 3) */
    onCrit: 'onCrit',
  } as const;

  override get defaultSlotIds (): EquipSlot[] {
    if (
      this.system.weaponSubtype === WEAPON_SUBTYPE.TWO_HANDED_WEAPON
      || this.system.weaponSubtype === WEAPON_SUBTYPE.RANGED_WEAPON
    ) {
      return [MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT];
    }
    else if (this.system.weaponSubtype === WEAPON_SUBTYPE.LIGHT_WEAPON) {
      return [OFF_HAND_EQUIP_SLOT];
    }
    return super.defaultSlotIds;
  }
}

type WeaponType = Weapon;

export {
  Weapon,
};

export type {
  WeaponSource,
  WeaponType,
};
