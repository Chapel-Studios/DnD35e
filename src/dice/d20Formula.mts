/**
 * Formula-string assembly for D20-based rolls.
 *
 * @module
 */

/**
 * Wrap a resolved formula term in Foundry's bracket-flavor syntax (`client/dice/grammar.pegjs`'s
 * `Flavor = "[" ... "]"`, valid after a `Parenthetical`/`DiceTerm`/`NumericTerm`), e.g.
 * `(1d6 + 12)[Situational Modifier]`. Parenthesizing a multi-term expression lets
 * `ParentheticalTerm#evaluate()` propagate the flavor onto every term inside that doesn't
 * already have its own (`Roll#propagateFlavor()`) — so a compound term's own dice group still
 * gets labeled in the roll's tooltip (`templates/dice/tooltip.hbs`'s `part-flavor`).
 */
function flavorTerm(term: string, flavor: string): string {
  return `(${term})[${flavor}]`;
}

/**
 * Split a resolved situational-modifier term into its flat numeric sum (safe to show as its
 * own labeled modifier-breakdown entry) and whether it also contains dice or other non-flat
 * sub-terms. Uses Foundry's own Roll parser (`new Roll(term).terms` — parsed eagerly by the
 * constructor, no `evaluate()` needed) instead of hand-rolled regex, so mixed expressions like
 * `1d6 + 12` split correctly.
 */
function extractFlatModifier(term: string): { flat: number; hasDice: boolean } {
  const trimmed = term.trim();
  
  if (!trimmed) return { flat: 0, hasDice: false };

  let flat = 0;
  let sign = 1;
  let hasDice = false;
  for (const rollTerm of new Roll(trimmed).terms) {
    if (rollTerm instanceof foundry.dice.terms.OperatorTerm) sign = rollTerm.operator === '-' ? -1 : 1;
    else if (rollTerm instanceof foundry.dice.terms.NumericTerm) flat += sign * rollTerm.number;
    else if (rollTerm instanceof foundry.dice.terms.DiceTerm) hasDice = true;
  }
  return { flat, hasDice };
}

/**
 * Build a `1d20 + base + situational` formula string, omitting any zero term (see
 * poc/phase-07-roll-formulas.md §7.2's "No `@attr` Bridge" — values are plain numbers
 * interpolated directly, not formula references). `situationalModifier` is a resolved
 * FormulaFamiliar term (already run through `resolveFormulaString`), so it may itself contain
 * dice (e.g. `1d6`) — a term with dice is flavor-tagged with `labels.situational` and appended
 * raw; a plain flat number is appended as a normal signed term instead (unlabeled — it already
 * gets its own modifier-breakdown entry via `extractFlatModifier()`, see callers). `labels.base`
 * flavor-tags the `1d20` die itself so it always reads as the check, never confusable with a
 * situational die.
 */
function buildD20Formula(base: number, situationalModifier: string, labels?: { base?: string; situational?: string }): string {
  const terms = [labels?.base ? flavorTerm('1d20', labels.base) : '1d20'];
  if (base !== 0) terms.push(base >= 0 ? `+ ${base}` : `- ${Math.abs(base)}`);
  const trimmed = situationalModifier.trim();
  const { flat, hasDice } = extractFlatModifier(trimmed);
  if (hasDice) {
    terms.push(`+ ${labels?.situational ? flavorTerm(trimmed, labels.situational) : trimmed}`);
  } else if (flat !== 0) {
    terms.push(flat >= 0 ? `+ ${flat}` : `- ${Math.abs(flat)}`);
  }
  return terms.join(' ');
}

export { buildD20Formula, extractFlatModifier, flavorTerm };
