/**
 * getTwoWeaponFightingPenalty — poc.10 §10.3. Not a schema field: computed at
 * execution time by inspecting whatever weapon currently occupies the actor's
 * **off-hand** slot, regardless of which hand is actually attacking.
 *
 * Baseline SRD penalty (no feat awareness yet — Two-Weapon Fighting/Improved/Greater TWF
 * land once a Feat item type exists): -6 primary-hand / -10 off-hand, reduced to -4/-8 on
 * **both** hands' attacks when the off-hand's equipped weapon has
 * `weaponSubtype === LIGHT_WEAPON` — only the off-hand weapon's lightness matters, never
 * the attacking hand's own weapon.
 *
 * @module
 */
import type { WieldedHand } from '@constants/equipmentSlots.mjs';
import { BOTH_HANDS_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT } from '@constants/equipmentSlots.mjs';
import { weaponItemType } from '@items/itemTypes.mjs';

import { WEAPON_SUBTYPE } from '../data/constants.mjs';
import type { Weapon } from '../Weapon.mjs';

/** Finds whatever weapon currently occupies the actor's off-hand equip slot, if any. */
function findOffHandWeapon (weapon: Weapon): Weapon | undefined {
  const actor = weapon.actor;
  if (!actor) return undefined;
  return [...actor.items].find(
    (item): item is Weapon =>
      item.type === weaponItemType
      && (item as unknown as Weapon).system.equippedSlotIds.includes(OFF_HAND_EQUIP_SLOT)
  );
}

/**
 * `weapon` is the attacking weapon (used only to resolve the actor); `hand` is the hand
 * making this attack. `'both'` (two-handed grip) is exempt from TWF penalties, as is any
 * attack made with no weapon currently equipped in the off-hand slot (nothing to fight
 * two-weapon with).
 */
function getTwoWeaponFightingPenalty (weapon: Weapon, hand: WieldedHand): number {
  const offHandWeapon = findOffHandWeapon(weapon);
  if (hand === BOTH_HANDS_EQUIP_SLOT || !offHandWeapon) return 0;
  const baseline = hand === OFF_HAND_EQUIP_SLOT ? -10 : -6;
  const offHandIsLight = offHandWeapon.system.weaponSubtype === WEAPON_SUBTYPE.LIGHT_WEAPON;
  if (!offHandIsLight) return baseline;
  return hand === OFF_HAND_EQUIP_SLOT ? -8 : -4;
}

export { getTwoWeaponFightingPenalty };
