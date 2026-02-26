/**
 * Game Rules settings registration
 */

import { SYSTEM_ID } from '../shared.mjs';
import {
  DIAGONAL_MOVEMENT_CHOICES,
  EXPERIENCE_RATE_CHOICES,
  GAME_RULES_KEYS,
} from './constants.mjs';

/**
 * Register game rules settings
 */
function registerGameRulesSettings(): void {
  game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.DIAGONAL_MOVEMENT, {
    name: 'DND35E.Settings.DiagonalMovement.Name',
    hint: 'DND35E.Settings.DiagonalMovement.Hint',
    scope: 'world',
    config: false,
    type: String,
    default: '5105',
    choices: DIAGONAL_MOVEMENT_CHOICES,
    onChange: (rule: unknown) => {
      if (canvas.ready) {
        // @ts-expect-error Foundry grid API
        canvas.grid.diagonalRule = rule as string;
      }
    },
  });

  game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.EXPERIENCE_RATE, {
    name: 'DND35E.Settings.ExperienceRate.Name',
    hint: 'DND35E.Settings.ExperienceRate.Hint',
    scope: 'world',
    config: false,
    type: String,
    default: 'medium',
    choices: EXPERIENCE_RATE_CHOICES,
    onChange: () => {
      // Re-render character sheets to update XP display
      for (const actor of game.actors ?? []) {
        if (actor.type === 'character' && actor.sheet?.rendered) {
          actor.sheet.render();
        }
      }
    },
  });

  game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.DISABLE_EXPERIENCE_TRACKING, {
    name: 'DND35E.Settings.DisableExperienceTracking.Name',
    hint: 'DND35E.Settings.DisableExperienceTracking.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.USE_FRACTIONAL_BASE_BONUSES, {
    name: 'DND35E.Settings.FractionalBaseBonuses.Name',
    hint: 'DND35E.Settings.FractionalBaseBonuses.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
    onChange: () => {
      // Trigger actor updates
      for (const actor of game.actors ?? []) {
        actor.reset();
      }
    },
  });

  game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.ALLOW_BACKGROUND_SKILLS, {
    name: 'DND35E.Settings.BackgroundSkills.Name',
    hint: 'DND35E.Settings.BackgroundSkills.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
    onChange: () => {
      // Re-render character sheets to show/hide background skills
      for (const actor of game.actors ?? []) {
        if (actor.sheet?.rendered) {
          actor.sheet.render(true);
        }
      }
    },
  });

  game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.PSIONICS_ARE_DIFFERENT, {
    name: 'DND35E.Settings.PsionicsAreDifferent.Name',
    hint: 'DND35E.Settings.PsionicsAreDifferent.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.MEASURE_STYLE, {
    name: 'DND35E.Settings.MeasureStyle.Name',
    hint: 'DND35E.Settings.MeasureStyle.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
  });

  game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.LOW_LIGHT_VISION_MODE, {
    name: 'DND35E.Settings.LowLightVisionMode.Name',
    hint: 'DND35E.Settings.LowLightVisionMode.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.USE_COMBAT_CHARACTER_SHEET, {
    name: 'DND35E.Settings.UseCombatCharacterSheet.Name',
    hint: 'DND35E.Settings.UseCombatCharacterSheet.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: () => {
      window.location.reload();
    },
  });
}

export {
  registerGameRulesSettings,
};
