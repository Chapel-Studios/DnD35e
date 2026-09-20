import type { DatabaseCreateCallbackOptions } from '@common/abstract/_types.mjs';
import type { EquipSlot } from '@constants/equipmentSlots.mjs';
import { MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT } from '@constants/equipmentSlots.mjs';
import type { DocumentUpdateCallbackOptions } from '@documents/document/DocumentDnd35e.mjs';
import { EFFECT_CHANGE_PHASE } from '@effects/baseActiveEffect/data/constants.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/index.mjs';
import type { WeaponItemType } from '@items/itemTypes.mjs';
import { EquippableItem } from '@items/physical/equippableItem/index.mjs';

import type { PhysicalItemSourceProps } from '../physicalItem/PhysicalItem.mjs';
import { WEAPON_SUBTYPE } from './data/constants.mjs';
import type { WeaponSystemData, WeaponSystemSource } from './data/WeaponSystemData.mjs';
import { syncWeaponActions } from './logic/weaponActionSync.mjs';

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
      || this.system.weaponSubtype === WEAPON_SUBTYPE.TWO_HANDED_RANGED_WEAPON
    ) {
      return [MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT];
    }
    else if (this.system.weaponSubtype === WEAPON_SUBTYPE.LIGHT_WEAPON) {
      return [OFF_HAND_EQUIP_SLOT];
    }
    return super.defaultSlotIds;
  }

  /**
   * Live-merges a lightweight actor-side stub for each of this weapon's own
   * system-created `system.actions` entries onto `system.actions.<id>` (poc.10 §10.4) —
   * see `ActionDataModel.createActionChange()`. Runs unconditionally (not equip-gated);
   * `requiresEquipped` gates usability at execution time, not merge time.
   */
  override getContributedActorChanges(phase: string): EffectChangeDataDnd35e[] {
    const changes = super.getContributedActorChanges(phase);
    if (phase !== EFFECT_CHANGE_PHASE.FINAL) return changes;

    const actionChanges = this.system.actions.map((action) => action.createActionChange());

    return [...changes, ...actionChanges];
  }

  protected override async _onCreate(
    updateData: DeepPartial<this['_source']>,
    options: DatabaseCreateCallbackOptions,
    userId: string
  ): Promise<void> {
    super._onCreate(updateData, options, userId);
    await syncWeaponActions(this);
  }

  /**
   * Keeps `system.actions` in sync whenever `weaponSubtype` or `properties` changes
   * (poc.10 §10.3) — the same lifecycle point `PhysicalItem._onUpdate()` already reacts
   * from for containment sync, since this performs a genuine array mutation that must
   * never run from prep-time derivation.
   */
  protected override async _onUpdate(
    data: Record<string, unknown>,
    options: DocumentUpdateCallbackOptions,
    userId: string
  ): Promise<void> {
    await super._onUpdate(data, options, userId);

    const changedSystem = data.system as Partial<WeaponSystemSource> | undefined;
    if (!changedSystem) return;
    if ('weaponSubtype' in changedSystem || 'properties' in changedSystem) {
      await syncWeaponActions(this);
    }
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

