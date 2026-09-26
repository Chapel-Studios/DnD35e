/**
 * isWithinReach — target validation for attack actions (see phase-10-basic-combat.md §10.5).
 *
 * @module
 */
import { useSettingsStore } from '@settings/index.mjs';

import type { TokenDnd35e } from '../TokenDnd35e.mjs';

/**
 * `canvas.grid.measurePath().distance` is expressed in the scene's configured grid distance
 * units (ft or m), not squares, so `reachSquares` is converted the same way
 * `TokenRulerDnd35e#getLocalizedBudget()` converts a stored square count before comparison.
 */
function isWithinReach(attacker: TokenDnd35e, target: TokenDnd35e, reachSquares: number): boolean {
  const { measurement: { convertToLocalizedDistance } } = useSettingsStore();
  const distance = canvas.grid.measurePath([attacker.center, target.center]).distance;
  return distance <= convertToLocalizedDistance(reachSquares);
}

export { isWithinReach };
