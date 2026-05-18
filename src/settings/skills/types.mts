/**
 * Type definitions for skill settings
 */

/**
 * Custom skill configuration
 */
export interface CustomSkill {
  /** Skill name */
  name: string;
  /** Governing attribute (short form) */
  attribute: string;
  /** Whether training is required */
  requiresTraining: boolean;
  /** Whether armor check penalty applies */
  armorCheckPenalty: boolean;
}

/**
 * Skill visibility and custom skills settings
 */
export interface SkillSettings {
  /** Visibility settings per skill key */
  skills: Record<string, string>;
  /** Custom skill definitions */
  customSkills: CustomSkill[];
}
