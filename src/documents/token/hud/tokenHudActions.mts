/**
 * tokenHudActions — eligibility/label computation for the Token HUD's Weapon Attacks and
 * Combat Maneuvers controls (poc.10 §10.11). Read-only view-model builders; no mutation.
 *
 * Weapon Attacks: one entry per carried weapon's top-level action, filtered to
 * `item.system.isCarried && (item.system.isEquipped || action.requiresEquipped === false)` —
 * this filter is the *only* place `requiresEquipped` is enforced; `WeaponAttackDataModel`
 * itself no longer re-gates on equip state at execution time (§10.11), since the sheet's
 * Actions tab intentionally lets a carried-but-unequipped weapon's action fire. Enabled
 * state follows `canUseHandAttack()` for the wield mode's BAB hand, same as the sheet's
 * Actions tab (WeaponsSection.vue) — but unlike the sheet, ineligible entries are omitted
 * entirely rather than merely disabled, since the HUD palette has no room for an
 * explanatory tooltip.
 *
 * Combat Maneuvers: this phase renders only a "Total Defense" entry (§10.7's special action is
 * Story E's scope — this module only establishes the HUD row/entry shell, always enabled; the
 * click handler surfaces a "not yet implemented" notice until Story E wires the real mechanic).
 *
 * @module
 */
import { detectWieldedHand } from '@actors/baseActor/logic/wieldMode.mjs';
import type { Creature } from '@actors/creature/Creature.mjs';
import { canUseHandAttack, getHandBab } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';
import { WEAPON_ACTION_TYPE, WEAPON_ACTION_TYPES } from '@items/baseItem/actions/constants.mjs';
import type { IAction } from '@items/baseItem/actions/types.mjs';
import type { Weapon } from '@items/physical/weapon/index.mjs';

import type { TokenHudCombatManeuverRow, TokenHudWeaponActionRow } from './tokenHudTypes.mjs';

/** The combatant tracking this per-round action economy, if any encounter is active — resolved by the HUD's own rendered token, never a re-resolved placeable, which is ambiguous when multiple tokens share one prototype actor. */
function getActiveCombatant(token: TokenDnd35e): CombatantDnd35e | undefined {
  if (!game.combat?.started) return undefined;
  return game.combat.getCombatantsByToken(token.id)[0] as CombatantDnd35e | undefined;
}

const WEAPON_ATTACK_DEFAULT_ICON = {
  [WEAPON_ACTION_TYPE.MELEE]: 'icons/svg/sword.svg',
  [WEAPON_ACTION_TYPE.RANGED]: 'icons/svg/bow.svg',
}; 

/** Weapon Attacks HUD palette entries — see module doc for the eligibility/enabled rules. */
async function getWeaponActionChoices(actor: Creature, token: TokenDnd35e): Promise<TokenHudWeaponActionRow[]> {
  const combatant = getActiveCombatant(token) ?? null;
  const rows: TokenHudWeaponActionRow[] = [];

  const weaponActions: IAction[] = await Promise.all(Object.values(actor.system.actions)
    .filter((iAction: IAction) => WEAPON_ACTION_TYPES.includes(iAction.type)));
  for (const iAction of weaponActions) {
    const weapon = await fromUuid<Weapon>(iAction.itemUuid);
    // since this pointer is recreated on each data life cycle it should be safe to presume it exists
    const actualAction = weapon?.system.actions.find((action) => action._id === iAction.id);

    if (
      !weapon
      || !actualAction
      || !weapon?.system.isCarried
      || (!weapon?.system.isEquipped && actualAction?.requiresEquipped !== false)
    ) {
      continue;
    }

    const hand = detectWieldedHand(actor, weapon);
    const baseLabel = actualAction.name.resolvedValue ?? weapon.name;
    // If not in combat assume full bab is available
    const availableBab = combatant
      ? getHandBab(combatant, hand)
      : actor.system.bab;
    const label = `${baseLabel} (${availableBab})`;

    rows.push({
      itemId: weapon.id,
      actionId: actualAction!._id,
      label,
      img: weapon.img ?? WEAPON_ATTACK_DEFAULT_ICON[actualAction.type],
      enabled: !combatant || canUseHandAttack(combatant, hand),
    });
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
