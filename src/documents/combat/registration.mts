/**
 * Registration for the Combat/Combatant document classes.
 *
 * @module
 */
import { CombatantDnd35e } from './combatant/CombatantDnd35e.mjs';
import { CombatDnd35e } from './CombatDnd35e.mjs';

export const registerCombat = () => {
  foundry.helpers.Hooks.once('init', () => {
    CONFIG.Combat.documentClass = CombatDnd35e;
    CONFIG.Combatant.documentClass = CombatantDnd35e;
  });
};
