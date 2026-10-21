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
 * Combat Maneuvers: this phase renders only a "Total Defense" entry (poc.10 Story E) — a
 * standard action (SRD), so `enabled` follows `canUseAction(combatant, [ACTION_ECONOMY.STANDARD])`
 * (outside combat it's always enabled, same convention as Weapon Attacks' `!combatant ||` fallback).
 * The click handler (`TokenHudDnd35e#onCombatManeuver`) spends the action and applies the AE.
 *
 * @module
 */
import { detectWieldedHand } from '@actors/baseActor/logic/wieldMode.mjs';
import type { Creature } from '@actors/creature/Creature.mjs';
import { ACTION_ECONOMY } from '@constants/actionEconomy.mjs';
import { canUseAction, canUseHandAttack, getHandBab } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';
import { WEAPON_ACTION_TYPE, WEAPON_ACTION_TYPES } from '@items/baseItem/actions/constants.mjs';
import type { IAction } from '@items/baseItem/actions/types.mjs';
import type { Weapon } from '@items/physical/weapon/index.mjs';

import type { TokenHudCombatManeuverRow, TokenHudConcealmentRow, TokenHudWeaponActionRow } from './tokenHudTypes.mjs';

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
      || !actualAction.isTopLevel
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

/** Combat Maneuvers HUD palette entries — Total Defense is the only maneuver so far (poc.10 Story E). */
function getCombatManeuverChoices(token: TokenDnd35e): TokenHudCombatManeuverRow[] {
  const combatant = getActiveCombatant(token) ?? null;
  return [
    {
      id: 'totalDefense',
      label: game.i18n.localize('dnd35e.COMBAT.Maneuver.TotalDefense'),
      enabled: !combatant || canUseAction(combatant, [ACTION_ECONOMY.STANDARD]) !== null,
    },
  ];
}

/**
 * Concealment tiers (None/Concealed/Full), ordered by descending threshold so the first match
 * for `percent >= threshold` is the correct "closest tier downward" (e.g. 49% is still Concealed,
 * not Full) — the field itself is a real 0-100 percent, only the HUD groups it into 3 presets.
 */
const CONCEALMENT_TIERS = [
  { id: 'full', threshold: 50, iconClass: 'fa-solid fa-cloud', categoryKey: 'dnd35e.COMBAT.HUD.ConcealmentCategoryFull' },
  { id: 'concealed', threshold: 20, iconClass: 'fa-solid fa-cloud-sun', categoryKey: 'dnd35e.COMBAT.HUD.ConcealmentCategoryConcealed' },
  { id: 'none', threshold: 0, iconClass: 'fa-regular fa-cloud', categoryKey: 'dnd35e.COMBAT.HUD.ConcealmentCategoryNone' },
] as const;

function getConcealmentTier(percent: number): (typeof CONCEALMENT_TIERS)[number] {
  return CONCEALMENT_TIERS.find((tier) => percent >= tier.threshold) ?? CONCEALMENT_TIERS[CONCEALMENT_TIERS.length - 1];
}

/** Concealment HUD palette entries (None/Concealed 20%/Full Concealment 50%, mirrors D35E's checkboxes) — `cssClass` marks whichever preset matches the actor's current tier. */
function getConcealmentChoices(concealment: number): TokenHudConcealmentRow[] {
  const localize = (key: string) => game.i18n.localize(`dnd35e.COMBAT.HUD.${key}`);
  const activeTier = getConcealmentTier(concealment).id;
  const options: { id: string; label: string; value: number }[] = [
    { id: 'none', label: localize('ConcealmentNone'), value: 0 },
    { id: 'concealed', label: localize('ConcealmentConcealed'), value: 20 },
    { id: 'full', label: localize('ConcealmentFull'), value: 50 },
  ];
  return options.map((option) => ({ ...option, cssClass: option.id === activeTier ? 'active' : '' }));
}

/** Toggle button's icon + tooltip for the actor's actual (0-100) concealment percent, not just the preset tier value. */
function getConcealmentButtonInfo(percent: number): { iconClass: string; tooltip: string } {
  const tier = getConcealmentTier(percent);
  const tooltip = game.i18n.format('dnd35e.COMBAT.HUD.ConcealmentTooltip', {
    category: game.i18n.localize(tier.categoryKey),
    percent,
  });
  return { iconClass: tier.iconClass, tooltip };
}

export { getActiveCombatant, getCombatManeuverChoices, getConcealmentButtonInfo, getConcealmentChoices, getWeaponActionChoices };
