/**
 * Skills settings constants
 */

import type { CustomSkill, SkillSettings } from './_types.mjs';

/** Skill settings key */
export const SKILLS_KEY = 'skillSettings';

/** Skills settings menu key */
export const SKILLS_MENU = 'skillsConfig';

/** Default skill settings configuration */
export const DEFAULT_SKILL_SETTINGS: SkillSettings = {
  skills: {},
  customSkills: [],
};

export type { CustomSkill, SkillSettings };
