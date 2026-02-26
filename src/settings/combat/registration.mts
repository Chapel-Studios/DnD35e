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
    name: 'DND35E.Settings.AutosizeWeapons.Name',
    hint: 'DND35E.Settings.AutosizeWeapons.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.AUTO_SCALE_ATTACKS_BAB, {
    name: 'DND35E.Settings.AutoScaleAttacksBab.Name',
    hint: 'DND35E.Settings.AutoScaleAttacksBab.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.ALLOW_NO_AMMO, {
    name: 'DND35E.Settings.AllowNoAmmo.Name',
    hint: 'DND35E.Settings.AllowNoAmmo.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.USE_AUTO_AMMO_RECOVERY, {
    name: 'DND35E.Settings.AutoAmmoRecovery.Name',
    hint: 'DND35E.Settings.AutoAmmoRecovery.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.NO_AUTO_SPELLPOINTS_COST, {
    name: 'DND35E.Settings.NoAutoSpellpointsCost.Name',
    hint: 'DND35E.Settings.NoAutoSpellpointsCost.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.SPELLPOINT_COST_FORMULA, {
    name: 'DND35E.Settings.SpellpointCostFormula.Name',
    hint: 'DND35E.Settings.SpellpointCostFormula.Hint',
    scope: 'world',
    config: false,
    type: String,
    default: '',
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.SHOW_FULL_ATTACK_CHAT_CARD, {
    name: 'DND35E.Settings.ShowFullAttackChatCard.Name',
    hint: 'DND35E.Settings.ShowFullAttackChatCard.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.REPEAT_ANIMATIONS, {
    name: 'DND35E.Settings.RepeatAnimations.Name',
    hint: 'DND35E.Settings.RepeatAnimations.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.THREATENED_SHOW_SQUARES, {
    name: 'DND35E.Settings.ThreatenedShowSquares.Name',
    hint: 'DND35E.Settings.ThreatenedShowSquares.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: () => {
      game.socket?.emit(`system.${SYSTEM_ID}`, { eventType: 'redrawCanvas' });
    },
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.AUTOMATE_FLANKING_THREAT, {
    name: 'DND35E.Settings.AutomateFlankingThreat.Name',
    hint: 'DND35E.Settings.AutomateFlankingThreat.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, COMBAT_KEYS.RANDOMIZE_HP, {
    name: 'DND35E.Settings.RandomizeHp.Name',
    hint: 'DND35E.Settings.RandomizeHp.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });
}

export {
  registerCombatSettings,
};
