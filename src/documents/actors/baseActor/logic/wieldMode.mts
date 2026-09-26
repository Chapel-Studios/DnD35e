import type { AbilityKey } from '@constants/abilities.mjs';
import { BOTH_HANDS_EQUIP_SLOT, MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT,type WieldedHand } from '@constants/equipmentSlots.mjs';
import { weaponItemType } from '@items/itemTypes.mjs';
import type { Weapon } from '@items/physical/weapon/Weapon.mjs';

import type { ActorDnd35e } from '../index.mjs';

/**
 * Detects `item`'s current wield mode/hand on `actor` (poc.10 §10.3) — not a schema
 * field, derived fresh at attack time from the weapon's **current** `equippedSlotIds`
 * since it can change attack-to-attack as equip slots are swapped mid-combat. Drives
 * both the STR damage term (`getHandStrTerm()`) and which BAB pool(s) an attack draws
 * from (`canUseHandAttack()`/`spendHandBab()`) — both read the same `WieldedHand` value
 * directly, no intermediate translation.
 * - `both` — `item.system.equippedSlotIds` occupies both the main-hand and off-hand slots
 * - `off` — occupies only the off-hand slot, **and** a different weapon currently
 *   occupies the main-hand slot (a genuine two-weapon-fighting pair)
 * - `main` — everything else (main-hand slot only, or off-hand slot with nothing
 *   else wielded in the main hand)
 */
function detectWieldedHand (actor: ActorDnd35e, item: Weapon): WieldedHand {
  const slots = item.system.equippedSlotIds;
  const inMainHand = slots.includes(MAIN_HAND_EQUIP_SLOT);
  const inOffHand = slots.includes(OFF_HAND_EQUIP_SLOT);

  if (inMainHand && inOffHand) return BOTH_HANDS_EQUIP_SLOT;

  if (inOffHand) {
    const mainHandOccupant = [...actor.items].find(
      (candidate): candidate is Weapon =>
        candidate.type === weaponItemType
        && candidate.id !== item.id
        && (candidate as Weapon).system.equippedSlotIds.includes(MAIN_HAND_EQUIP_SLOT)
    );
    if (mainHandOccupant) return OFF_HAND_EQUIP_SLOT;
  }

  return MAIN_HAND_EQUIP_SLOT;
}

/**
 * The STR damage term appended to a resolved damage formula for the given hand
 * (poc.10 §10.3) — Main gets the full modifier, Off gets half rounded down,
 * Both (two-handed) gets 1.5x rounded down. Never baked into a weapon's stored `damage.formula`;
 * always appended fresh at execution time.
 */
function getWeaponAttackActionAbilityModTerm (hand: WieldedHand, ability: AbilityKey): string {
  switch (hand) {
    case OFF_HAND_EQUIP_SLOT: return ` + $floor(#self.abilities.${ability}.mod / 2)`;
    case BOTH_HANDS_EQUIP_SLOT: return ` + $floor(#self.abilities.${ability}.mod * 1.5)`;
    case MAIN_HAND_EQUIP_SLOT:
    default: return ` + #self.abilities.${ability}.mod`;
  }
}

export {
  detectWieldedHand,
  getWeaponAttackActionAbilityModTerm, 
};
