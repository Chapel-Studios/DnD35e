/**
 * Skills settings registration
 */

import { SYSTEM_ID } from '../shared.mjs';
import { DEFAULT_SKILL_SETTINGS,SKILLS_KEY } from './constants.mjs';

/**
 * Register skills settings
 */
function registerSkillsSettings(): void {
  game.settings.register(SYSTEM_ID, SKILLS_KEY, {
    name: 'dnd35e.SETTINGS.SkillSettings',
    scope: 'world',
    config: false,
    type: Object,
    default: DEFAULT_SKILL_SETTINGS,
  });
}

export {
  registerSkillsSettings,
};
