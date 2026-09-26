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
 * sub-terms. Uses Foundry's own Roll parser/evaluator (`new Roll(term)` + `Roll.safeEval()`)
 * rather than hand-summing terms — a naive term-by-term walk mishandles non-additive operators
 * (e.g. `2 * 3` would be miscounted as `5` instead of `6`). Dice terms are zeroed out before
 * evaluating (they can't be pre-rolled into a flat preview number — the raw formula, dice
 * included, is what actually gets rolled; see callers), so e.g. `1d6 * 2 + 3` correctly
 * evaluates its flat portion as `0 * 2 + 3 = 3`.
 */
function extractFlatModifier(term: string): { flat: number; hasDice: boolean } {
  const trimmed = term.trim();

  if (!trimmed) return { flat: 0, hasDice: false };

  const roll = new Roll(trimmed);
  const hasDice = roll.dice.length > 0;
  const flatOnlyFormula = hasDice
    ? roll.terms.map(rollTerm => (rollTerm instanceof foundry.dice.terms.DiceTerm ? '0' : rollTerm.formula)).join(' ')
    : trimmed;

  return { flat: Roll.safeEval(flatOnlyFormula), hasDice };
}

/**
 * Build a `1d20 + base + situational` formula string, omitting any zero term (see
 * poc/phase-07-roll-formulas.md §7.2's "No `@attr` Bridge" — values are plain numbers
 * interpolated directly, not formula references). `situationalModifier` is a resolved
 * FormulaFamiliar term (already run through `resolveFormulaString`), so it may itself contain
 * dice (e.g. `1d6`) — a term with dice is flavor-tagged with `labels.situational` and appended
 * raw; a plain flat number is appended as a normal signed term instead (unlabeled — it already
 * gets its own modifier-breakdown entry via `extractFlatModifier()`, see callers). `labels.base`
 * flavors the `1d20` die directly (`1d20[label]`, no parens) so it always reads as the check,
 * never confusable with a situational die — `flavorTerm()`'s parenthesization is reserved for
 * the (possibly multi-term) situational modifier: wrapping the bare `1d20` in parens would turn
 * `roll.terms[0]` into a `ParentheticalTerm` instead of a `Die`, which is what `D20Roll#d20`
 * (and therefore natural 1/20 detection) requires.
 */
function buildD20Formula(base: number, situationalModifier: string, labels?: { base?: string; situational?: string }): string {
  const terms = [labels?.base ? `1d20[${labels.base}]` : '1d20'];

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
