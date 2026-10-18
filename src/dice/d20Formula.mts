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
 * evaluates its flat portion as `0 * 2 + 3 = 3`. Zeroing is keyed off `isDeterministic` rather
 * than `instanceof DiceTerm` because a leading negative dice term (e.g. `-1d10`) is parsed by
 * Foundry's grammar into a single wrapped term (`RollParser#_wrapNegativeTerm()`, surfaced as
 * `(1d10 * -1)`) — a top-level `instanceof` check misses the nested dice and leaves it in the
 * formula handed to `Roll.safeEval()`, which can't evaluate un-rolled dice notation.
 */
function extractFlatModifier(term: string): { flat: number; hasDice: boolean } {
  const trimmed = term.trim();

  if (!trimmed) return { flat: 0, hasDice: false };

  const roll = new Roll(trimmed);
  const hasDice = roll.dice.length > 0;
  const flatOnlyFormula = hasDice
    ? roll.terms.map(rollTerm => (rollTerm.isDeterministic ? rollTerm.formula : '0')).join(' ')
    : trimmed;

  return { flat: Roll.safeEval(flatOnlyFormula), hasDice };
}

/**
 * Isolates the dice-only portion of a resolved formula term (e.g. `'1d8 + 2'` -> `'1d8'`),
 * dropping any flat numeric remainder — used to show a weapon's own damage dice as its own
 * labeled modifier-breakdown row, separate from its flat enhancement-bonus row (see
 * `extractFlatModifier()`). Reuses `parseAdditiveDiceFragment()`'s safe-merge bailout: falls
 * back to the full term when it can't be decomposed (multiplication, parentheses, function
 * calls). Empty string when there's no dice at all.
 */
function extractDiceOnlyFormula(term: string): string {
  const trimmed = term.trim();
  if (!trimmed) return '';

  const parsed = parseAdditiveDiceFragment(trimmed);
  if (!parsed) return trimmed;

  const diceGroups = new Map<number, number>();
  for (const [faces, count] of parsed.diceGroups) diceGroups.set(faces, (diceGroups.get(faces) ?? 0) + count);

  return [...diceGroups.entries()]
    .filter(([, count]) => count !== 0)
    .sort(([a], [b]) => a - b)
    .map(([faces, count]) => `${count}d${faces}`)
    .join(' + ');
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

/**
 * Parses a single additive dice+flat fragment (e.g. `1d6 + 5`, `-1d4`, `7`) into its grouped
 * `Die` counts (keyed by `faces`) and flat remainder, using Foundry's own `Roll.parse()` (never
 * evaluated/rolled). Returns `null` — a safe-merge bailout — for anything beyond a plain
 * top-level `+`/`-` chain of `Die`/`NumericTerm`s: multiplication/division, parentheses,
 * function calls (e.g. a wield-mode `floor(x * 1.5)` term), or a `Die` with modifiers
 * (`1d20kh1`) all fall through to `null` rather than risk silently mis-combining them.
 */
function parseAdditiveDiceFragment(fragment: string): { diceGroups: [number, number][]; flat: number } | null {
  let terms: ReturnType<typeof Roll.parse>;
  try {
    terms = Roll.parse(fragment, {});
  } catch {
    return null;
  }

  const diceGroups: [number, number][] = [];
  let flat = 0;
  let sign = 1;

  for (const rollTerm of terms) {
    if (rollTerm instanceof foundry.dice.terms.OperatorTerm) {
      if (rollTerm.operator === '+') sign = 1;
      else if (rollTerm.operator === '-') sign = -1;
      else return null;
    } else if (rollTerm instanceof foundry.dice.terms.NumericTerm) {
      flat += sign * rollTerm.number;
    } else if (rollTerm instanceof foundry.dice.terms.Die) {
      if (rollTerm.modifiers.length > 0 || typeof rollTerm.faces !== 'number') return null;
      diceGroups.push([rollTerm.faces, sign * rollTerm.number]);
    } else {
      return null;
    }
  }

  return { diceGroups, flat };
}

/**
 * Combines multiple resolved, dice-preserving formula fragments (e.g. a weapon's own damage
 * dice, an enchant's bonus dice, and a situational modifier) into one dice-collapsed display
 * formula — same-faced `Die` groups are summed together and every flat remainder is folded into
 * a single trailing number, e.g. a weapon `1d6` plus a situational `1d6 + 5` becomes `2d6 + 5`
 * instead of staying as two separate `1d6` groups.
 *
 * This is display-only — it never touches the actual roll formula (which must keep e.g. a
 * wield-mode `floor(x * 1.5)` term as real Roll-evaluable syntax for Foundry's own grammar to
 * evaluate at roll time). Any fragment `parseAdditiveDiceFragment()` can't safely flatten
 * (multiplication, parentheses, function calls) is appended to the result unmerged, verbatim,
 * rather than silently mis-combined — callers that need to fold such a term's value in cleanly
 * should pass its already-evaluated flat number (e.g. via `extractFlatModifier().flat`) instead
 * of the raw term text.
 */
function combineDiceFormula(fragments: (string | null | undefined)[]): string {
  const diceGroups = new Map<number, number>();
  const opaqueFragments: string[] = [];
  let flatTotal = 0;

  for (const fragment of fragments) {
    const trimmed = fragment?.trim();
    if (!trimmed || trimmed === '0') continue;

    const parsed = parseAdditiveDiceFragment(trimmed);
    if (!parsed) {
      opaqueFragments.push(trimmed);
      continue;
    }

    flatTotal += parsed.flat;
    for (const [faces, count] of parsed.diceGroups) {
      diceGroups.set(faces, (diceGroups.get(faces) ?? 0) + count);
    }
  }

  const diceTerms = [...diceGroups.entries()]
    .filter(([, count]) => count !== 0)
    .sort(([a], [b]) => a - b)
    .map(([faces, count]) => `${count}d${faces}`);

  let formula = [...diceTerms, ...opaqueFragments].join(' + ');
  if (flatTotal !== 0) {
    formula = formula ? `${formula} ${flatTotal >= 0 ? '+' : '-'} ${Math.abs(flatTotal)}` : String(flatTotal);
  }
  return formula || '0';
}

export { buildD20Formula, combineDiceFormula, extractDiceOnlyFormula, extractFlatModifier, flavorTerm };
