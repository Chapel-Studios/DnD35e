
// "Attack Type" and "Combat Status" toggle groups — see phase-10-basic-combat.md §10.7's
// table for exactly which are auto-detected vs. manual-only, and why `proficient`/
// `nonLethal` carry `value: 0` (read directly by id below instead of folded into the

import { CHARGED_CONDITION_ID, DEFENSIVE_FIGHTING_CONDITION_ID, PRONE_CONDITION_ID, SQUEEZING_CONDITION_ID } from '@constants/conditions.mjs';
import { getActionEconomy, getTwoWeaponFightingChoice } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { isOnHigherGround } from '@documents/token/logic/highGround.mjs';
import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';
import type { ActionParticipant } from '@items/baseItem/actions/logic/actionParticipant.mjs';
import { participantActor, participantToken } from '@items/baseItem/actions/logic/actionParticipant.mjs';
import type { WeaponAttackModifierToggle } from '@source/rollDialogs/WeaponAttackRollDialog/types.mjs';

import { getTwoWeaponFightingPenalty, isWieldingTwoWeapons } from '../../logic/twoWeaponFighting.mjs';
import type { Weapon } from '../../Weapon.mjs';

// dialog's generic situational-modifier sum).
const createMeleeCombatModifiers = (
  attacker: ActionParticipant,
  targetToken: TokenDnd35e | undefined,
  weaponNonLethalDefault: boolean,
  nonLethalNoPenalty: boolean = false,
  weapon?: Weapon
): WeaponAttackModifierToggle[] => {
  const actor = participantActor(attacker);
  const actorToken = participantToken(attacker) ?? undefined;
  const actorCombatant = actorToken
    ? game.combat?.getCombatantsByToken(actorToken.id)[0] as CombatantDnd35e | undefined
    : undefined;

  const localize = (key: string) => game.i18n.localize(`dnd35e.COMBAT.CombatModifiers.${key}`);

  return [
    {
      id: 'twoWeaponFighting',
      group: 'attackType',
      label: game.i18n.localize('dnd35e.COMBAT.TwoWeaponFighting'),
      tooltip: localize('TwoWeaponFighting.Tooltip'),
      checked: (actorCombatant && getTwoWeaponFightingChoice(actorCombatant)) ?? isWieldingTwoWeapons(actor),
      wasAutoDetected: true,
      createRollModifiers: (checked, hand) => ({
        attackModifiers: checked && weapon
          ? [{ id: 'twoWeaponFighting', label: game.i18n.localize('dnd35e.COMBAT.TwoWeaponFighting'), value: getTwoWeaponFightingPenalty(weapon, hand, actor) }]
          : [],
        damageModifiers: [],
      }),
    },
    {
      id: 'flanking',
      group: 'combatStatus',
      label: localize('Flanking.Label'),
      tooltip: localize('Flanking.Tooltip'),
      checked: false,
      wasAutoDetected: false,
      createRollModifiers: (checked) => ({
        attackModifiers: checked
          ? [{
            id: 'flanking',
            value: 2,
            label: localize('Flanking.Label'),
            bonusTypeLabel: localize('Flanking.BonusType'),
          }]
          : [],
        damageModifiers: [] }),
    },
    {
      id: 'prone',
      group: 'combatStatus',
      label: localize('Prone.Label'),
      tooltip: localize('Prone.Tooltip'),
      checked: actor.statuses.has(PRONE_CONDITION_ID),
      wasAutoDetected: true,
      createRollModifiers: (checked) => ({
        attackModifiers: checked
          ? [{
            id: 'prone',
            value: -4,
            label: localize('Prone.Label'),
            bonusTypeLabel: localize('Prone.BonusType'),
          }] : [],
        damageModifiers: [] }),
    },
    {
      id: 'squeezing',
      group: 'combatStatus',
      label: localize('Squeezing.Label'),
      tooltip: localize('Squeezing.Tooltip'),
      checked: actor.statuses.has(SQUEEZING_CONDITION_ID),
      wasAutoDetected: true,
      createRollModifiers: (checked) => ({
        attackModifiers: checked
          ? [{
            id: 'squeezing',
            value: -4,
            label: localize('Squeezing.Label'),
            bonusTypeLabel: localize('Squeezing.BonusType'),
          }] : [],
        damageModifiers: [],
      }),
    },
    {
      id: 'highGround',
      group: 'combatStatus',
      label: localize('HighGround.Label'),
      tooltip: localize('HighGround.Tooltip'),
      checked: !!actorToken 
        && !!targetToken
        && isOnHigherGround(actorToken, targetToken),
      wasAutoDetected: true,
      createRollModifiers: (checked) => ({
        attackModifiers: checked ? [{
          id: 'highGround',
          value: 1,
          label: localize('HighGround.Label'),
          bonusTypeLabel: localize('HighGround.BonusType'),
        }] : [],
        damageModifiers: [],
      }),
    },
    {
      id: 'proficient',
      group: 'combatStatus',
      label: localize('Proficient.Label'),
      tooltip: localize('Proficient.Tooltip'),
      checked: false,
      wasAutoDetected: false,
      createRollModifiers: (checked) => ({
        attackModifiers: !checked
          ? [{
            id: 'proficient',
            value: -4,
            label: localize('NotProficient.Label'),
            bonusTypeLabel: localize('Proficient.BonusType'),
          }] : [],
        damageModifiers: [],
      }),
    },
    {
      id: 'charge',
      group: 'attackType',
      label: localize('Charge.Label'),
      tooltip: localize('Charge.Tooltip'),
      // Either signal means "this combatant charged": the action-economy flag (set by the
      // charge movement itself, this turn) or the CHARGED_CONDITION_ID status (set once this
      // very toggle was confirmed on a prior attack this turn, or applied manually via the
      // Token HUD as the escape hatch) — same OR-both pattern as prone/squeezing/defensiveFighting.
      checked: (!!actorCombatant && getActionEconomy(actorCombatant).used.chargedThisTurn)
        || actor.statuses.has(CHARGED_CONDITION_ID),
      wasAutoDetected: true,
      createRollModifiers: (checked) => ({
        attackModifiers: checked
          ? [{
            id: 'charge',
            value: 2,
            label: localize('Charge.Label'),
            bonusTypeLabel: localize('Charge.BonusType'),
          }] : [],
        damageModifiers: [],
      }),
    },
    {
      id: 'defensiveFighting',
      group: 'attackType',
      label: localize('DefensiveFighting.Label'),
      tooltip: localize('DefensiveFighting.Tooltip'),
      checked: actor.statuses.has(DEFENSIVE_FIGHTING_CONDITION_ID),
      wasAutoDetected: true,
      createRollModifiers: (checked) => ({
        attackModifiers: checked ? [{
          id: 'defensiveFighting',
          value: -4,
          label: localize('DefensiveFighting.Label'),
          bonusTypeLabel: localize('DefensiveFighting.BonusType'),
        }] : [],
        damageModifiers: [],
      }),
    },
    {
      id: 'nonLethal',
      group: 'attackType',
      label: localize('NonLethal.Label'),
      tooltip: localize('NonLethal.Tooltip'),
      checked: weaponNonLethalDefault,
      wasAutoDetected: true,
      createRollModifiers: (checked) => ({
        attackModifiers: (checked !== weaponNonLethalDefault) && !nonLethalNoPenalty
          ? [{
            id: 'nonLethal',
            value: -4,
            label: localize(checked ? 'NonLethal.Label' : 'Lethal.Label'),
            bonusTypeLabel: localize('NonLethal.BonusType'),
          }] : [],
        damageModifiers: [],
      }),
    },
  ];
};

export {
  createMeleeCombatModifiers,
};
