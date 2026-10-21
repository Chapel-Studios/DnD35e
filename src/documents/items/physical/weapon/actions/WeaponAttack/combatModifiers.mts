
// "Attack Type" and "Combat Status" toggle groups — see phase-10-basic-combat.md §10.7's
// table for exactly which are auto-detected vs. manual-only, and why `proficient`/
// `nonLethal` carry `value: 0` (read directly by id below instead of folded into the

import { CHARGED_CONDITION_ID, DEFENSIVE_FIGHTING_CONDITION_ID, PRONE_CONDITION_ID, SQUEEZING_CONDITION_ID } from '@constants/conditions.mjs';
import { getActionEconomy } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { isOnHigherGround } from '@documents/token/logic/highGround.mjs';
import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';
import type { ActionParticipant } from '@items/baseItem/actions/logic/actionParticipant.mjs';
import { participantActor, participantToken } from '@items/baseItem/actions/logic/actionParticipant.mjs';
import type { CombatModifierToggle } from '@source/rollDialogs/WeaponAttackRollDialog/types.mjs';

// dialog's generic situational-modifier sum).
const createCombatModifiers = (
  attacker: ActionParticipant,
  targetToken: TokenDnd35e | undefined,
  weaponNonLethalDefault: boolean
): CombatModifierToggle[] => {
  const actor = participantActor(attacker);
  const actorToken = participantToken(attacker) ?? undefined;
  const actorCombatant = actorToken
    ? game.combat?.getCombatantsByToken(actorToken.id)[0] as CombatantDnd35e | undefined
    : undefined;

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
      // Either signal means "this combatant charged": the action-economy flag (set by the
      // charge movement itself, this turn) or the CHARGED_CONDITION_ID status (set once this
      // very toggle was confirmed on a prior attack this turn, or applied manually via the
      // Token HUD as the escape hatch) — same OR-both pattern as prone/squeezing/defensiveFighting.
      checked: (!!actorCombatant && getActionEconomy(actorCombatant).used.chargedThisTurn)
        || actor.statuses.has(CHARGED_CONDITION_ID),
      autoDetected: true,
    },
    {
      id: 'defensiveFighting',
      group: 'attackType',
      label: localize('DefensiveFighting.Label'),
      tooltip: localize('DefensiveFighting.Tooltip'),
      value: -4,
      checked: actor.statuses.has(DEFENSIVE_FIGHTING_CONDITION_ID),
      autoDetected: true,
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
