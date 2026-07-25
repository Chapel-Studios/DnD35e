import type { SenseEntrySource } from '@actors/creature/data/CreatureSystemData.mjs';
import { LOW_LIGHT_VISION } from '@constants/senses.mjs';

/**
 * RAW: "A creature with low-light vision can see twice as far as a human in dim light,
 * moonlight, torchlight, and similar conditions of poor illumination." Matches D35E's
 * default (`system.senses.lowLightMultiplier` defaults to 2 in `module/actor/entity.js`).
 */
const DEFAULT_LOW_LIGHT_MULTIPLIER = 2;

/** The low-light radius multiplier granted by this set of senses, or null if none apply. */
const getLowLightMultiplier = (senses: SenseEntrySource[]): number | null =>
  senses.some(sense => sense.type === LOW_LIGHT_VISION) ? DEFAULT_LOW_LIGHT_MULTIPLIER : null;

interface LowLightObserver {
  /** Whether this token is currently selected/controlled by the viewing user. */
  controlled: boolean;
  /** Whether the viewing user owns this token's actor. */
  owner: boolean;
  /** This observer's low-light multiplier, or null if it has no low-light vision. */
  lowLightMultiplier: number | null;
}

/**
 * Resolves the light-radius multiplier that should currently apply on the canvas, mirroring
 * D35E's `LLVMixin#getRadius()` (`module/canvas/low-light-vision.js`) simplified for dnd35e's
 * single-perspective model (no GM "requires selection" world setting):
 *  - if the viewing user has controlled/selected token(s), only those count as observers
 *  - otherwise, fall back to all tokens the user owns
 *  - the highest multiplier among the counted observers with low-light vision wins
 *  - 1 (no boost) if none of the counted observers have low-light vision
 */
const resolveLowLightMultiplier = (observers: LowLightObserver[]): number => {
  const controlled = observers.filter(observer => observer.controlled);
  const candidates = controlled.length > 0 ? controlled : observers.filter(observer => observer.owner);
  const multipliers = candidates
    .map(observer => observer.lowLightMultiplier)
    .filter((multiplier): multiplier is number => multiplier !== null);
  return multipliers.length > 0 ? Math.max(...multipliers) : 1;
};

/** Scales a light source's dim/bright radii by the given multiplier (a multiplier of 1 is a no-op). */
const scaleLightRadius = <T extends { dim: number; bright: number }>(data: T, multiplier: number): T => (
  multiplier === 1
    ? data
    : {
      ...data,
      dim: data.dim * multiplier,
      bright: data.bright * multiplier,
    }
);

export { DEFAULT_LOW_LIGHT_MULTIPLIER, getLowLightMultiplier, resolveLowLightMultiplier, scaleLightRadius };
export type { LowLightObserver };
