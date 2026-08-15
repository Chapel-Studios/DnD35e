/**
 * Formula-string assembly for D20-based rolls.
 *
 * @module
 */

/**
 * Build a `1d20 + base + situational` formula string, omitting any zero term (see
 * poc/phase-07-roll-formulas.md §7.2's "No `@attr` Bridge" — values are plain numbers
 * interpolated directly, not formula references).
 */
function buildD20Formula(base: number, situationalModifier: number): string {
  const terms = ['1d20'];
  if (base !== 0) terms.push(base >= 0 ? `+ ${base}` : `- ${Math.abs(base)}`);
  if (situationalModifier !== 0) terms.push(situationalModifier >= 0 ? `+ ${situationalModifier}` : `- ${Math.abs(situationalModifier)}`);
  return terms.join(' ');
}

export { buildD20Formula };
