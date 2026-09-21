/**
 * tokenHudActions — eligibility/label computation for the Token HUD's Weapon Attacks and
 * Combat Maneuvers controls (poc.10 §10.11). Read-only view-model builders; no mutation.
 *
 * Weapon Attacks: one entry per carried weapon's top-level action, filtered to
 * `item.system.isCarried && (item.system.isEquipped || action.requiresEquipped === false)` —
 * mirrors `WeaponAttackDataModel#_canExecute()`'s own `requiresEquipped` gate (§10.4) without
 * calling the protected method directly. Enabled state follows `canUseHandAttack()` for the
 * wield mode's BAB hand, same as the sheet's Actions tab (WeaponsSection.vue) — but unlike the
 * sheet, ineligible entries are omitted entirely rather than merely disabled, since the HUD
 * palette has no room for an explanatory tooltip.
 *
 * Combat Maneuvers: this phase renders only a "Total Defense" entry (§10.7's special action is
 * Story E's scope — this module only establishes the HUD row/entry shell, always enabled; the
 * click handler surfaces a "not yet implemented" notice until Story E wires the real mechanic).
 *
 * @module
 */
import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import { detectWieldMode, wieldModeToBabHand } from '@actors/baseActor/ActorDnd35e.mjs';
import { canUseHandAttack } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { WeaponAction } from '@items/baseItem/actions/types.mjs';
import { weaponItemType } from '@items/itemTypes.mjs';
import type { Weapon } from '@items/physical/weapon/index.mjs';

import type { TokenHudCombatManeuverRow, TokenHudWeaponActionRow } from './tokenHudTypes.mjs';


const isWeapon = (item: { type: string }): item is Weapon => item.type === weaponItemType;

/** The combatant tracking this actor's per-round action economy, if any encounter is active. */
function getActiveCombatant(actor: ActorDnd35e): CombatantDnd35e | undefined {
  if (!game.combat?.started) return undefined;
  return game.combat.combatants.find((combatant) => combatant.actor?.id === actor.id) as CombatantDnd35e | undefined;
}

/** Weapon Attacks HUD palette entries — see module doc for the eligibility/enabled rules. */
function getWeaponActionChoices(actor: ActorDnd35e): TokenHudWeaponActionRow[] {
  const combatant = getActiveCombatant(actor);
  const rows: TokenHudWeaponActionRow[] = [];

  const weapons = [...actor.items].filter(isWeapon).filter((item) => item.system.isCarried);
  for (const weapon of weapons) {
    const actions = weapon.system.actions.filter((action) => action.isTopLevel) as WeaponAction[];
    for (const action of actions) {
      if (!weapon.system.isEquipped && action.requiresEquipped !== false) continue;

      const hand = wieldModeToBabHand(detectWieldMode(actor, weapon));
      rows.push({
        itemId: weapon.id,
        actionId: action._id,
        label: weapon.name,
        img: weapon.img ?? 'icons/svg/sword.svg',
        enabled: !combatant || canUseHandAttack(combatant, hand),
      });
    }
  }

  return rows;
}

/** Combat Maneuvers HUD palette entries — Total Defense shell only this phase (see module doc). */
function getCombatManeuverChoices(): TokenHudCombatManeuverRow[] {
  return [
    {
      id: 'totalDefense',
      label: game.i18n.localize('dnd35e.COMBAT.Maneuver.TotalDefense'),
      enabled: true,
    },
  ];
}

export { getCombatManeuverChoices, getWeaponActionChoices };
