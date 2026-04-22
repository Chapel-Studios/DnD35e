/**
 * Combat settings registration
 */

import { SYSTEM_ID } from '../shared.mjs';
import { COMBAT_KEYS } from './constants.mjs';

/**
 * Register combat settings
 */
function registerCombatSettings(): void {
  game.settings.register(SYSTEM_ID, COMBAT_KEYS.AUTOSIZE_WEAPONS, {
    name: 'dnd35e.SETTINGS.AutosizeWeapons.Name',
    hint: 'dnd35e.SETTINGS.AutosizeWeapons.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.AUTO_SCALE_ATTACKS_BAB, {
    name: 'dnd35e.SETTINGS.AutoScaleAttacksBab.Name',
    hint: 'dnd35e.SETTINGS.AutoScaleAttacksBab.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.ALLOW_NO_AMMO, {
    name: 'dnd35e.SETTINGS.AllowNoAmmo.Name',
    hint: 'dnd35e.SETTINGS.AllowNoAmmo.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.USE_AUTO_AMMO_RECOVERY, {
    name: 'dnd35e.SETTINGS.AutoAmmoRecovery.Name',
    hint: 'dnd35e.SETTINGS.AutoAmmoRecovery.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.NO_AUTO_SPELLPOINTS_COST, {
    name: 'dnd35e.SETTINGS.NoAutoSpellpointsCost.Name',
    hint: 'dnd35e.SETTINGS.NoAutoSpellpointsCost.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.SPELLPOINT_COST_FORMULA, {
    name: 'dnd35e.SETTINGS.SpellpointCostFormula.Name',
    hint: 'dnd35e.SETTINGS.SpellpointCostFormula.Hint',
    scope: 'world',
    config: false,
    type: String,
    default: '',
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.SHOW_FULL_ATTACK_CHAT_CARD, {
    name: 'dnd35e.SETTINGS.ShowFullAttackChatCard.Name',
    hint: 'dnd35e.SETTINGS.ShowFullAttackChatCard.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.REPEAT_ANIMATIONS, {
    name: 'dnd35e.SETTINGS.RepeatAnimations.Name',
    hint: 'dnd35e.SETTINGS.RepeatAnimations.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.THREATENED_SHOW_SQUARES, {
    name: 'dnd35e.SETTINGS.ThreatenedShowSquares.Name',
    hint: 'dnd35e.SETTINGS.ThreatenedShowSquares.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: () => {
      game.socket?.emit(`system.${SYSTEM_ID}`, { eventType: 'redrawCanvas' });
    },
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.AUTOMATE_FLANKING_THREAT, {
    name: 'dnd35e.SETTINGS.AutomateFlankingThreat.Name',
    hint: 'dnd35e.SETTINGS.AutomateFlankingThreat.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.RANDOMIZE_HP, {
    name: 'dnd35e.SETTINGS.RandomizeHp.Name',
    hint: 'dnd35e.SETTINGS.RandomizeHp.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.ENFORCE_SINGLE_MATERIAL, {
    name: 'dnd35e.SETTINGS.EnforceSingleMaterial.Name',
    hint: 'dnd35e.SETTINGS.EnforceSingleMaterial.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });
}

export {
  registerCombatSettings,
};
