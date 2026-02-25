/**
 * Combat settings registration
 */

import { SETTINGS, SYSTEM_ID } from '../constants/index.mjs';

/**
 * Register combat settings
 */
function registerCombatSettings(): void {
  game.settings.register(SYSTEM_ID, SETTINGS.AUTOSIZE_WEAPONS, {
    name: 'DND35E.Settings.AutosizeWeapons.Name',
    hint: 'DND35E.Settings.AutosizeWeapons.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });

  game.settings.register(SYSTEM_ID, SETTINGS.AUTO_SCALE_ATTACKS_BAB, {
    name: 'DND35E.Settings.AutoScaleAttacksBab.Name',
    hint: 'DND35E.Settings.AutoScaleAttacksBab.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });

  game.settings.register(SYSTEM_ID, SETTINGS.ALLOW_NO_AMMO, {
    name: 'DND35E.Settings.AllowNoAmmo.Name',
    hint: 'DND35E.Settings.AllowNoAmmo.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, SETTINGS.USE_AUTO_AMMO_RECOVERY, {
    name: 'DND35E.Settings.AutoAmmoRecovery.Name',
    hint: 'DND35E.Settings.AutoAmmoRecovery.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, SETTINGS.NO_AUTO_SPELLPOINTS_COST, {
    name: 'DND35E.Settings.NoAutoSpellpointsCost.Name',
    hint: 'DND35E.Settings.NoAutoSpellpointsCost.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, SETTINGS.SPELLPOINT_COST_FORMULA, {
    name: 'DND35E.Settings.SpellpointCostFormula.Name',
    hint: 'DND35E.Settings.SpellpointCostFormula.Hint',
    scope: 'world',
    config: false,
    type: String,
    default: '',
  });

  game.settings.register(SYSTEM_ID, SETTINGS.LOW_LIGHT_VISION_MODE, {
    name: 'DND35E.Settings.LowLightVisionMode.Name',
    hint: 'DND35E.Settings.LowLightVisionMode.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });
}

export {
  registerCombatSettings,
};
