import { CRIT_EXEMPT_MARKER, CRIT_MULTIPLY_MARKER } from '@constants/critDiceMarkers.mjs';

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
function parseAdditiveDiceFragment(fragment: string): { diceGroups: [number, number, string | undefined][]; flat: number } | null {
  let terms: ReturnType<typeof Roll.parse>;
  try {
    terms = Roll.parse(fragment, {});
  } catch {
    return null;
  }

  const diceGroups: [number, number, string | undefined][] = [];
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
      diceGroups.push([rollTerm.faces, sign * rollTerm.number, rollTerm.flavor || undefined]);
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

/**
 * Appends `[label]` directly after each top-level dice group in `formula` (e.g.
 * `3d6[label] + 1 + 1d6[label]`) so Foundry's own dice tooltip (`Roll#getTooltip()`) shows a
 * flavor label for every damage dice group — the same parity `_buildAttackFormula()`'s bare
 * `1d20[attackName]` gives the attack roll's tooltip. No parentheses are used: not needed
 * directly after a bare `Die` term per Foundry's grammar, and wrapping would turn the group
 * into a `ParentheticalTerm`, which `Roll#alter()` can't reach into for critical-hit dice
 * multiplication (see `DamageRoll#evaluateCritical()`) — each group must stay its own
 * top-level term. Falls back to `formula` unchanged when it contains anything beyond a plain
 * top-level +/- chain of dice/numeric terms (see `parseAdditiveDiceFragment()`) — safer to
 * leave unlabeled than risk mis-rendering an unexpected construct.
 */
function flavorDiceGroups(formula: string, label: string): string {
  const parsed = parseAdditiveDiceFragment(formula);
  if (!parsed) return formula;

  const parts: string[] = [];
  for (const [faces, count] of parsed.diceGroups) {
    if (count === 0) continue;
    const term = `${Math.abs(count)}d${faces}[${label}]`;
    parts.push(parts.length === 0 ? (count < 0 ? `-${term}` : term) : `${count < 0 ? '-' : '+'} ${term}`);
  }
  if (parsed.flat !== 0) {
    parts.push(parts.length === 0 ? String(parsed.flat) : `${parsed.flat >= 0 ? '+' : '-'} ${Math.abs(parsed.flat)}`);
  }
  return parts.length > 0 ? parts.join(' ') : '0';
}

/**
 * Splits a weapon's resolved damage formula into its own base dice (flavor-tagged with
 * `baseLabel`) versus each contributing AE override's own dice (flavor-tagged with that
 * effect's own `effectName` instead) — e.g. `2d6[Greatsword] + 1d6[+1 Flaming] + 9`. Every
 * dice group stays a bare top-level `Die` term (no parenthetical wrapping): the SRD
 * critical-hit exception for AE-contributed "extra damage dice" ("extra damage dice over and
 * above a weapon's normal damage are never multiplied", e.g. a Flaming weapon's bonus 1d6 fire)
 * is enforced later, explicitly, by `DamageRoll#evaluateCritical()` skipping each dice group
 * whose 0-based position (the Nth `Die` term encountered, left to right) appears in the
 * returned `exemptDiceIndices` — NOT by exploiting `Roll#alter()`'s blind skip of
 * `ParentheticalTerm`s, which would also (incorrectly) exempt any unrelated non-dice
 * parenthetical that happens to appear in the formula for other reasons, and NOT by matching
 * each group's own `[flavor]` label — a label only identifies a group's DISPLAY source (weapon
 * name / AE name), and two groups from the SAME source can still need opposite crit treatment
 * (see the escape hatches below), so position is the only signal granular enough. All flat
 * contributions (the weapon's own plus every override's) stay a single unflavored top-level
 * signed number — SRD draws no exception for flat bonuses (enhancement, Strength, etc. all
 * multiply), and an unflavored term is always crit-multiplier-eligible.
 *
 * Positional: `RollFormulaStringField` only ever appends AE `add` changes to the end of the
 * formula (`appendRollFormulaTerm()`), so the resolved formula's dice groups are always
 * `[...weapon's own groups, ...override1's groups, ...override2's groups, ...]` in that exact
 * order — walking `overrides` in reverse peels its own trailing groups off the parsed list
 * first, with no need to re-parse the base formula's own text separately.
 *
 * Escape hatches: an author can invert the default exemption for a specific dice group via two
 * FormulaFamiliar functions (`FormulaResolver.functionGrammar.mts`), each resolving to the
 * group's dice text with a reserved marker embedded as its own `[flavor]` tag
 * (`@constants/critDiceMarkers.mjs`) that survives formula resolution as plain text:
 * - `$critMultiply(1d6)`, used inside an AE's own formula/change value, keeps that group
 *   eligible for crit multiplication despite being AE-sourced (positional owner !== weapon).
 *   Mixable with plain (unmarked) dice from the SAME AE — e.g. an AE formula of
 *   `1d6 + $critMultiply(1d6)` exempts the first `1d6` by default and keeps the second
 *   eligible, since each is tracked by its own group index, not by their shared label.
 * - `$critExempt(1d6)`, used inside the weapon's own base `damageFormula`, exempts that group
 *   despite being the weapon's own base dice (positional owner === weapon) — displayed with a
 *   generic "Extra Damage" label instead of the weapon's own name, since it's no longer part of
 *   the weapon's normal damage for crit purposes. Mixable the same way: `1d8 + $critExempt(1d4)`
 *   multiplies only the `1d8`.
 * A marker is a no-op when it only confirms the group's already-default treatment (e.g.
 * `$critExempt` on an override's own dice, which are already exempt by default).
 *
 * Falls back to `{ formula: flavorDiceGroups(resolvedFormula, baseLabel), exemptDiceIndices: [] }`
 * (single label, no split, nothing exempt) when the formula isn't a plain additive dice/numeric
 * chain.
 */
function flavorDamageDiceBySource(
  resolvedFormula: string,
  baseLabel: string,
  overrides: { effectName: string; value: string }[]
): { formula: string; exemptDiceIndices: number[] } {
  const parsed = parseAdditiveDiceFragment(resolvedFormula);
  if (!parsed) return { formula: flavorDiceGroups(resolvedFormula, baseLabel), exemptDiceIndices: [] };

  const nonZeroGroups = parsed.diceGroups.filter(([, count]) => count !== 0);
  // -1 = the weapon's own dice; otherwise an index into `overrides`.
  const ownerPerGroup = new Array<number>(nonZeroGroups.length).fill(-1);
  let cursor = nonZeroGroups.length;
  for (let i = overrides.length - 1; i >= 0 && cursor > 0; i--) {
    const overrideParsed = parseAdditiveDiceFragment(overrides[i].value);
    const count = overrideParsed ? overrideParsed.diceGroups.filter(([, c]) => c !== 0).length : 0;
    for (let j = 0; j < count && cursor > 0; j++) {
      cursor -= 1;
      ownerPerGroup[cursor] = i;
    }
  }

  const extraDamageLabel = game.i18n.localize('dnd35e.COMBAT.ExtraDamageDice');
  // idx here is each group's 0-based position among nonZeroGroups, which is also the order
  // their `Die` terms land in the final formula text below — exactly what `evaluateCritical()`
  // counts against when matching `exemptDiceIndices`.
  const exemptDiceIndices: number[] = [];
  const parts: string[] = [];
  nonZeroGroups.forEach(([faces, count, marker], idx) => {
    const owner = ownerPerGroup[idx];
    const forcedExempt = marker === CRIT_EXEMPT_MARKER;
    const forcedEligible = marker === CRIT_MULTIPLY_MARKER;
    const isExempt = forcedExempt ? true : forcedEligible ? false : owner !== -1;
    if (isExempt) exemptDiceIndices.push(idx);
    const label = owner === -1
      ? (forcedExempt ? extraDamageLabel : baseLabel)
      : overrides[owner].effectName;
    const term = `${Math.abs(count)}d${faces}[${label}]`;
    parts.push(parts.length === 0 ? (count < 0 ? `-${term}` : term) : `${count < 0 ? '-' : '+'} ${term}`);
  });

  let formula = parts.join(' ');
  if (parsed.flat !== 0) {
    formula = formula ? `${formula} ${parsed.flat >= 0 ? '+' : '-'} ${Math.abs(parsed.flat)}` : String(parsed.flat);
  }
  return { formula: formula || '0', exemptDiceIndices };
}

export { buildD20Formula, combineDiceFormula, extractDiceOnlyFormula, extractFlatModifier, flavorDamageDiceBySource, flavorDiceGroups, flavorTerm };

