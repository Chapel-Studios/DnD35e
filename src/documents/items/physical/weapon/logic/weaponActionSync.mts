/**
 * weaponActionSync — auto-create/auto-delete sync for a weapon's system-managed
 * top-level `MeleeWeaponAttack`/`RangedWeaponAttack` entry (poc.10 §10.3), sibling of
 * `masterworkAe.mts`'s `syncMasterworkAeState()`. Reacts to `weaponSubtype` changes —
 * wired from `Weapon._onUpdate()`, not `prepareDerivedData()`, since this performs a
 * genuine array mutation. Thrown is a `properties` flag authored directly on a ranged
 * action (§10.4), not something this sync manages.
 *
 * Every entry carries `isSystemCreated: boolean` (`true` on auto-created entries). The
 * moment a user edits any field on one, it flips to `false` and becomes permanent —
 * never auto-deleted again, mirroring how a custom Masterwork AE survives `isMasterwork`
 * toggling off. This module only ever creates a fresh entry or deletes one still
 * `isSystemCreated === true`; it never touches a user-edited (detached) entry.
 *
 * @module
 */
import { ACTION_TYPE } from '@items/baseItem/actions/constants.mjs';
import type { WeaponAction } from '@items/baseItem/actions/types.mjs';

import { WEAPON_SUBTYPE } from '../data/constants.mjs';
import type { Weapon } from '../Weapon.mjs';

/** Melee vs. Ranged is driven by `weaponSubtype` (§10.3). */
function isRangedSubtype (weaponSubtype: string): boolean {
  return weaponSubtype === WEAPON_SUBTYPE.RANGED_WEAPON || weaponSubtype === WEAPON_SUBTYPE.TWO_HANDED_RANGED_WEAPON;
}

/**
 * Recomputes the weapon's `system.actions` array to match its current `weaponSubtype`
 * (melee vs. ranged, straight either/or swap). No-ops (no `update()` call at all) when
 * nothing needs to change, to avoid recursively re-triggering `Weapon._onUpdate()`.
 */
async function syncWeaponActions (weapon: Weapon): Promise<void> {
  const isRanged = isRangedSubtype(weapon.system.weaponSubtype);
  const desiredType = isRanged
    ? ACTION_TYPE.RANGED_WEAPON_ATTACK
    : ACTION_TYPE.MELEE_WEAPON_ATTACK;
  const inapplicableType = isRanged
    ? ACTION_TYPE.MELEE_WEAPON_ATTACK
    : ACTION_TYPE.RANGED_WEAPON_ATTACK;

  let actions = [...weapon.system.actions];
  let changed = false;

  if (!actions.some((action) => action.type === desiredType && action.isTopLevel)) {
    actions.push({
      _id: foundry.utils.randomID(),
      type: desiredType,
      name: { formula: game.i18n.localize('dnd35e.WEAPON.ACTIONS.DefaultName'), resolvedValue: null, expectedType: 'string' },
      isSystemCreated: true,
      isTopLevel: true,
    } as unknown as WeaponAction);
    changed = true;
  }

  const inapplicableIndex = actions.findIndex((action) => action.type === inapplicableType && action.isTopLevel);
  if (inapplicableIndex !== -1 && actions[inapplicableIndex].isSystemCreated) {
    actions = actions.filter((_, index) => index !== inapplicableIndex);
    changed = true;
  }

  if (!changed) return;
  await weapon.update({ 'system.actions': actions });
}

export { syncWeaponActions };
