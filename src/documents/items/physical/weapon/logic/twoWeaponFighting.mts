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
import { OFF_HAND_EQUIP_SLOT } from '@constants/equipmentSlots.mjs';
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
 * making this attack. `'both'` (two-handed grip) is treated the same as `'main'` — TWF
 * penalties don't apply to a two-handed attack.
 */
function getTwoWeaponFightingPenalty (weapon: Weapon, hand: 'main' | 'off' | 'both'): number {
  const baseline = hand === 'off' ? -10 : -6;
  const offHandWeapon = findOffHandWeapon(weapon);
  const offHandIsLight = offHandWeapon?.system.weaponSubtype === WEAPON_SUBTYPE.LIGHT_WEAPON;
  if (!offHandIsLight) return baseline;
  return hand === 'off' ? -8 : -4;
}

export { getTwoWeaponFightingPenalty };
