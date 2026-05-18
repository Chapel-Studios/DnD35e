/**
 * Game Rules settings registration
 */

import { SYSTEM_ID } from '../shared.mjs';
import {
  DEFAULT_DAMAGE_REDUCTION_TYPES,
  GAME_RULES_KEYS,
  GAME_RULES_MENU,
} from './constants.mjs';
import { GameRulesSettingsConfig } from './sheet/index.mjs';

/**
 * Register the Game Rules settings menu button
 */
function registerGameRulesMenu(): void {
  game.settings.registerMenu(SYSTEM_ID, GAME_RULES_MENU, {
    name: 'dnd35e.SETTINGS.GameRules.Name',
    label: 'dnd35e.SETTINGS.GameRules.Label',
    hint: 'dnd35e.SETTINGS.GameRules.Hint',
    icon: 'fas fa-list-check',
    type: GameRulesSettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: true,
  });
}

/**
 * Register game rules settings
 */
function registerGameRulesSettings(): void {
  registerGameRulesMenu();
  // game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.DIAGONAL_MOVEMENT, {
  //   name: 'dnd35e.SETTINGS.DiagonalMovement.Name',
  //   hint: 'dnd35e.SETTINGS.DiagonalMovement.Hint',
  //   scope: 'world',
  //   config: false,
  //   type: String,
  //   default: '5105',
  //   choices: DIAGONAL_MOVEMENT_CHOICES,
  //   onChange: (rule: unknown) => {
  //     if (canvas.ready) {
  //       // @ts-expect-error Foundry grid API
  //       canvas.grid.diagonalRule = rule as string;
  //     }
  //   },
  // });

  // game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.EXPERIENCE_RATE, {
  //   name: 'dnd35e.SETTINGS.ExperienceRate.Name',
  //   hint: 'dnd35e.SETTINGS.ExperienceRate.Hint',
  //   scope: 'world',
  //   config: false,
  //   type: String,
  //   default: 'medium',
  //   choices: EXPERIENCE_RATE_CHOICES,
  //   onChange: () => {
  //     // Re-render character sheets to update XP display
  //     for (const actor of game.actors ?? []) {
  //       if (actor.type === 'character' && actor.sheet?.rendered) {
  //         actor.sheet.render();
  //       }
  //     }
  //   },
  // });

  // game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.DISABLE_EXPERIENCE_TRACKING, {
  //   name: 'dnd35e.SETTINGS.DisableExperienceTracking.Name',
  //   hint: 'dnd35e.SETTINGS.DisableExperienceTracking.Hint',
  //   scope: 'world',
  //   config: false,
  //   type: Boolean,
  //   default: false,
  // });

  // game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.USE_FRACTIONAL_BASE_BONUSES, {
  //   name: 'dnd35e.SETTINGS.FractionalBaseBonuses.Name',
  //   hint: 'dnd35e.SETTINGS.FractionalBaseBonuses.Hint',
  //   scope: 'world',
  //   config: false,
  //   type: Boolean,
  //   default: false,
  //   onChange: () => {
  //     // Trigger actor updates
  //     for (const actor of game.actors ?? []) {
  //       actor.reset();
  //     }
  //   },
  // });

  // game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.ALLOW_BACKGROUND_SKILLS, {
  //   name: 'dnd35e.SETTINGS.BackgroundSkills.Name',
  //   hint: 'dnd35e.SETTINGS.BackgroundSkills.Hint',
  //   scope: 'world',
  //   config: false,
  //   type: Boolean,
  //   default: false,
  //   onChange: () => {
  //     // Re-render character sheets to show/hide background skills
  //     for (const actor of game.actors ?? []) {
  //       if (actor.sheet?.rendered) {
  //         actor.sheet.render(true);
  //       }
  //     }
  //   },
  // });

  // game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.PSIONICS_ARE_DIFFERENT, {
  //   name: 'dnd35e.SETTINGS.PsionicsAreDifferent.Name',
  //   hint: 'dnd35e.SETTINGS.PsionicsAreDifferent.Hint',
  //   scope: 'world',
  //   config: false,
  //   type: Boolean,
  //   default: false,
  // });

  // game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.MEASURE_STYLE, {
  //   name: 'dnd35e.SETTINGS.MeasureStyle.Name',
  //   hint: 'dnd35e.SETTINGS.MeasureStyle.Hint',
  //   scope: 'world',
  //   config: false,
  //   type: Boolean,
  //   default: true,
  // });

  // game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.LOW_LIGHT_VISION_MODE, {
  //   name: 'dnd35e.SETTINGS.LowLightVisionMode.Name',
  //   hint: 'dnd35e.SETTINGS.LowLightVisionMode.Hint',
  //   scope: 'world',
  //   config: false,
  //   type: Boolean,
  //   default: false,
  // });

  // game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.USE_COMBAT_CHARACTER_SHEET, {
  //   name: 'dnd35e.SETTINGS.UseCombatCharacterSheet.Name',
  //   hint: 'dnd35e.SETTINGS.UseCombatCharacterSheet.Hint',
  //   scope: 'world',
  //   config: false,
  //   type: Boolean,
  //   default: true,
  //   onChange: () => {
  //     window.location.reload();
  //   },
  // });

  game.settings.register(SYSTEM_ID, GAME_RULES_KEYS.DAMAGE_REDUCTION_TYPES, {
    name: 'dnd35e.SETTINGS.DamageReductionTypes.Name',
    hint: 'dnd35e.SETTINGS.DamageReductionTypes.Hint',
    scope: 'world',
    config: false,
    type: Object,
    default: DEFAULT_DAMAGE_REDUCTION_TYPES,
  });
}

export {
  registerGameRulesSettings,
};
