
// "Attack Type" and "Combat Status" toggle groups — see phase-10-basic-combat.md §10.7's
// table for exactly which are auto-detected vs. manual-only, and why `proficient`/
// `nonLethal` carry `value: 0` (read directly by id below instead of folded into the

import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import { PRONE_CONDITION_ID, SQUEEZING_CONDITION_ID } from '@constants/conditions.mjs';
import { getActionEconomy } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { isOnHigherGround } from '@documents/token/logic/highGround.mjs';
import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';
import type { CombatModifierToggle } from '@source/dice/rollDialogs/d20RollDialog/D20RollDialogConfig.mjs';

// dialog's generic situational-modifier sum).
const createCombatModifiers = (
  actor: ACTORS_DND35E,
  attackerToken: TokenDnd35e | undefined,
  targetToken: TokenDnd35e | undefined,
  combatant: CombatantDnd35e | undefined,
  weaponNonLethalDefault: boolean
): CombatModifierToggle[] => [
  {
    id: 'flanking',
    group: 'combatStatus',
    label: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.Flanking.Label'),
    tooltip: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.Flanking.Tooltip'),
    value: 2,
    checked: false,
    autoDetected: false,
  },
  {
    id: 'prone',
    group: 'combatStatus',
    label: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.Prone.Label'),
    tooltip: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.Prone.Tooltip'),
    value: -4,
    checked: actor.statuses.has(PRONE_CONDITION_ID),
    autoDetected: true,
  },
  {
    id: 'squeezing',
    group: 'combatStatus',
    label: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.Squeezing.Label'),
    tooltip: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.Squeezing.Tooltip'),
    value: -4,
    checked: actor.statuses.has(SQUEEZING_CONDITION_ID),
    autoDetected: true,
  },
  {
    id: 'highGround',
    group: 'combatStatus',
    label: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.HighGround.Label'),
    tooltip: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.HighGround.Tooltip'),
    value: 1,
    checked: !!attackerToken && !!targetToken && isOnHigherGround(attackerToken, targetToken),
    autoDetected: true,
  },
  {
    id: 'proficient',
    group: 'combatStatus',
    label: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.Proficient.Label'),
    tooltip: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.Proficient.Tooltip'),
    value: 0,
    checked: false,
    autoDetected: false,
  },
  {
    id: 'charge',
    group: 'attackType',
    label: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.Charge.Label'),
    tooltip: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.Charge.Tooltip'),
    value: 2,
    checked: combatant ? getActionEconomy(combatant).used.chargedThisTurn : false,
    autoDetected: true,
  },
  {
    id: 'defensiveFighting',
    group: 'attackType',
    label: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.DefensiveFighting.Label'),
    tooltip: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.DefensiveFighting.Tooltip'),
    value: -4,
    checked: false,
    autoDetected: false,
  },
  {
    id: 'nonLethal',
    group: 'attackType',
    label: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.NonLethal.Label'),
    tooltip: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.NonLethal.Tooltip'),
    value: 0,
    checked: weaponNonLethalDefault,
    autoDetected: true,
  },
];

export {
  createCombatModifiers,
};
