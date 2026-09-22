/**
 * isOnHigherGround — attack-roll auto-detection for the Combat Status modifier group
 * (poc.10 Story D, §10.7). Mirrors `isWithinReach()`'s elevation-comparison approach:
 * compares `TokenDocument#elevation` (already in the scene's real-world distance units,
 * same units `canvas.grid.measurePath()` returns), converted through the same localized
 * units helper `isWithinReach()` uses so the threshold reads correctly whether the scene
 * is configured in feet or meters.
 *
 * @module
 */
import { useSettingsStore } from '@settings/index.mjs';

import type { TokenDnd35e } from '../TokenDnd35e.mjs';

/** SRD: higher ground grants +1 to melee attack rolls when at least this many squares above the target. */
const HIGH_GROUND_ELEVATION_SQUARES = 2;

/** Whether `attacker` is at least `HIGH_GROUND_ELEVATION_SQUARES` above `target`. */
function isOnHigherGround(attacker: TokenDnd35e, target: TokenDnd35e): boolean {
  const { measurement: { convertToLocalizedDistance } } = useSettingsStore();
  const elevationDifference = (attacker.document.elevation ?? 0) - (target.document.elevation ?? 0);
  return elevationDifference >= convertToLocalizedDistance(HIGH_GROUND_ELEVATION_SQUARES);
}

export { HIGH_GROUND_ELEVATION_SQUARES, isOnHigherGround };
