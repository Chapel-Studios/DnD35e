
// "Attack Type" and "Combat Status" toggle groups — see phase-10-basic-combat.md §10.7's
// table for exactly which are auto-detected vs. manual-only, and why `proficient`/
// `nonLethal` carry `value: 0` (read directly by id below instead of folded into the

import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import { PRONE_CONDITION_ID, SQUEEZING_CONDITION_ID } from '@constants/conditions.mjs';
import { getActionEconomy } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { getActorToken } from '@documents/token/logic/getActorToken.mjs';
import { isOnHigherGround } from '@documents/token/logic/highGround.mjs';
import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';
import type { CombatModifierToggle } from '@source/rollDialogs/WeaponAttackRollDialog/types.mjs';

// dialog's generic situational-modifier sum).
const createCombatModifiers = (
  actor: ACTORS_DND35E,
  targetToken: TokenDnd35e | undefined,
  weaponNonLethalDefault: boolean
): CombatModifierToggle[] => {
  const actorCombatant = game.combat?.combatants.find(c => c.actor?.id === actor.id) as CombatantDnd35e | undefined;
  const actorToken = getActorToken(actor);

  const localize = (key: string) => game.i18n.localize(`dnd35e.COMBAT.CombatModifiers.${key}`);

  return [
    {
      id: 'flanking',
      group: 'combatStatus',
      label: localize('Flanking.Label'),
      tooltip: localize('Flanking.Tooltip'),
      value: 2,
      checked: false,
      autoDetected: false,
    },
    {
      id: 'prone',
      group: 'combatStatus',
      label: localize('Prone.Label'),
      tooltip: localize('Prone.Tooltip'),
      value: -4,
      checked: actor.statuses.has(PRONE_CONDITION_ID),
      autoDetected: true,
    },
    {
      id: 'squeezing',
      group: 'combatStatus',
      label: localize('Squeezing.Label'),
      tooltip: localize('Squeezing.Tooltip'),
      value: -4,
      checked: actor.statuses.has(SQUEEZING_CONDITION_ID),
      autoDetected: true,
    },
    {
      id: 'highGround',
      group: 'combatStatus',
      label: localize('HighGround.Label'),
      tooltip: localize('HighGround.Tooltip'),
      value: 1,
      checked: !!actorToken 
        && !!targetToken
        && isOnHigherGround(actorToken, targetToken),
      autoDetected: true,
    },
    {
      id: 'proficient',
      group: 'combatStatus',
      label: localize('Proficient.Label'),
      tooltip: localize('Proficient.Tooltip'),
      value: 0,
      checked: false,
      autoDetected: false,
    },
    {
      id: 'charge',
      group: 'attackType',
      label: localize('Charge.Label'),
      tooltip: localize('Charge.Tooltip'),
      value: 2,
      checked: !!actorCombatant
        ? getActionEconomy(actorCombatant).used.chargedThisTurn
        : false,
      autoDetected: true,
    },
    {
      id: 'defensiveFighting',
      group: 'attackType',
      label: localize('DefensiveFighting.Label'),
      tooltip: localize('DefensiveFighting.Tooltip'),
      value: -4,
      checked: false,
      autoDetected: false,
    },
    {
      id: 'nonLethal',
      group: 'attackType',
      label: localize('NonLethal.Label'),
      tooltip: localize('NonLethal.Tooltip'),
      value: 0,
      checked: weaponNonLethalDefault,
      autoDetected: true,
    },
  ];
};

export {
  createCombatModifiers,
};
