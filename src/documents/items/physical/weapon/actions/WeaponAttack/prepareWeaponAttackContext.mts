/**
 * Builds the weapon-attack-specific `UseWeaponAttackContext` (hand/attackAbility/
 * availableBab) for `Creature#useAction()` — called only once the action being invoked
 * is detected as a weapon attack (see `WeaponAttackDataModel`). `attackAbility` here is
 * only the STR default; `MeleeWeaponAttack._executeCheck()` overrides it to DEX for
 * finesse weapons once the concrete action subtype is known.
 *
 * @module
 */
import { detectWieldMode, wieldModeToBabHand } from '@actors/baseActor/ActorDnd35e.mjs';
import { STR } from '@constants/abilities.mjs';
import type { ACTORS_DND35E } from '@documents/actors/actorTypes.mjs';
import type { Weapon } from '@items/physical/weapon/index.mjs';

import type { UseWeaponAttackContext } from './types.mjs';

function prepareWeaponAttackContext(
  actor: ACTORS_DND35E,
  item: Weapon,
  target: ACTORS_DND35E[] | null
): UseWeaponAttackContext {
  const wieldMode = detectWieldMode(actor, item);
  const hand = wieldModeToBabHand(wieldMode);

  return {
    actor,
    target,
    hand,
    wieldMode,
    attackAbility: STR,
    availableBab: actor.system.bab,
  };
}

export { prepareWeaponAttackContext };
