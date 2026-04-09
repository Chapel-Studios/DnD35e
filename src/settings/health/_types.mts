/**
 * Type definitions for health settings
 */

/**
 * Hit die computation method
 */
export interface HitDieConfig {
  /** Whether to auto-compute HP */
  auto: boolean;
  /** Rate multiplier for HP calculation */
  rate: number;
  /** Number of levels to maximize HD */
  maximized: string;
}

/**
 * Health configuration settings
 */
export interface HealthConfig {
  hitdice: {
    PC: HitDieConfig;
    NPC: HitDieConfig;
    Racial: HitDieConfig;
  };
  /** Rounding mode for HP calculations */
  rounding: 'up' | 'nearest' | 'down';
  /** HP continuity mode */
  continuity: 'continuous' | 'discrete';
  /** Variant health rules */
  variants: {
    pc: { useWoundsAndVigor: boolean };
    npc: { useWoundsAndVigor: boolean };
  };
}
