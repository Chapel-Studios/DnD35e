/**
 * Skills settings module
 */

export type { CustomSkill, SkillSettings } from './_types.mjs';
export {
  DEFAULT_SKILL_SETTINGS,
  SKILLS_KEY,
  SKILLS_MENU,
} from './constants.mjs';
export { registerSkillsSettings } from './registration.mjs';
export { SkillSettingsConfig } from './sheet/index.mjs';
