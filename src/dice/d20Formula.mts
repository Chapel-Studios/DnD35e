import type { DamageType } from '@constants/attacks/damageTypes.mjs';
import { readCritOverride } from '@constants/critDiceMarkers.mjs';
import { stripMarkerFlavors, withMarkerField } from '@constants/diceMarkerBag.mjs';
import { readDamageType } from '@constants/typedDamageMarkers.mjs';

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
 * `extractFlatModifier()`). Backed by `parseFormulaComponents()` (defined further below), so it
 * handles the same wider range of shapes (dice modifiers, multiplication, functions, pools) as
 * the damage-dice attribution pipeline — simple same-face dice merge together as before;
 * anything else (a glued multiplicative group, a function, a pool) passes through as its own
 * opaque, unmerged fragment rather than silently dropping it. Falls back to a marker-stripped
 * copy of the full term when it can't be decomposed at all (a genuine parse error). Empty
 * string when there's no dice at all.
 */
function extractDiceOnlyFormula(term: string): string {
  const trimmed = term.trim();
  if (!trimmed) return '';

  const components = parseFormulaComponents(trimmed);
  if (!components) return stripMarkerFlavors(trimmed);

  const simpleDice = new Map<number, number>();
  const opaqueParts: string[] = [];
  for (const component of components) {
    if (!component.isDice || component.isZero) continue;
    if (component.simpleDie) {
      simpleDice.set(component.simpleDie.faces, (simpleDice.get(component.simpleDie.faces) ?? 0) + component.simpleDie.count);
    } else {
      const emitted = component.emit(null);
      opaqueParts.push(component.sign < 0 ? `-${emitted}` : emitted);
    }
  }

  const diceTerms = [...simpleDice.entries()]
    .filter(([, count]) => count !== 0)
    .sort(([a], [b]) => a - b)
    .map(([faces, count]) => `${count}d${faces}`);

  return [...diceTerms, ...opaqueParts].join(' + ');
}

interface FormulaParts {
  dice: string[];
  flatTerms: string[];
}

/**
 * Split a resolved formula into additive, signed formula strings without rolling or merging.
 * Parenthetical flavors are inherited by both dice and flat terms; explicit inner flavors
 * win over inherited flavors and the optional default. Unflavored terms remain unflavored
 * when no default is supplied. Multiplication, division, functions, and pools stay intact:
 * an inseparable expression belongs to dice if non-deterministic, otherwise flatTerms.
 * Invalid formulas throw the Foundry parser's error.
 *
 * @example
 * splitFormulaParts('(1d6 + 3)[Fire] + 2', 'Weapon');
 * // { dice: ['1d6[Fire]'], flatTerms: ['3[Fire]', '2[Weapon]'] }
 */
function splitFormulaParts(formula: string, defaultFlavor?: string): FormulaParts {
  const parts: FormulaParts = { dice: [], flatTerms: [] };
  const { OperatorTerm, ParentheticalTerm } = foundry.dice.terms;

  function collect(expression: string, inheritedFlavor?: string, sign = 1): void {
    const terms = Roll.parse(expression, {});
    let group: typeof terms = [];
    let groupSign = sign;

    function appendGroup(): void {
      if (!group.length) return;
      const [first] = group;
      if (group.length === 1 && first instanceof ParentheticalTerm) {
        collect(first.term, first.flavor || inheritedFlavor, groupSign);
        return;
      }

      const text = group.map((term) => {
        if (term instanceof OperatorTerm) return term.operator;
        if (term.flavor || !inheritedFlavor) return term.formula;
        return `${term.expression}[${inheritedFlavor}]`;
      }).join(' ');
      const target = group.every(term => term.isDeterministic) ? parts.flatTerms : parts.dice;
      target.push(groupSign < 0 ? `-(${text})` : text);
    }

    for (const term of terms) {
      if (term instanceof OperatorTerm && (term.operator === '+' || term.operator === '-')) {
        appendGroup();
        group = [];
        groupSign = term.operator === '-' ? -sign : sign;
      } else {
        group.push(term);
      }
    }
    appendGroup();
  }

  if (formula.trim()) collect(formula, defaultFlavor);
  return parts;
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
 * A single flavor-taggable component of a resolved formula — the richer replacement for
 * `parseAdditiveDiceFragment()`'s face/count tuple, used by the damage-dice marker/attribution
 * pipeline (`transformDiceGroupFlavors()`, `attributeDamageDiceGroups()`,
 * `flavorDamageDiceBySource()`, `groupDamageDiceBySource()`, `extractDiceOnlyFormula()`).
 * `parseAdditiveDiceFragment()`/`combineDiceFormula()` keep their own narrower, unrelated
 * multi-fragment-merging scope (see that function's doc) — intentionally not rebuilt on this.
 */
interface FormulaComponent {
  /** Non-deterministic (dice-bearing) — governs the "dice" vs "flat" display bucket. */
  isDice: boolean;
  /**
   * `true` only when this component's own anchor term is a genuine `Die` instance (bare or
   * modified) — confirmed against Foundry's own bundled source (`Die extends DiceTerm`;
   * `FunctionTerm`/`ParentheticalTerm`/`PoolTerm` extend `RollTerm` directly) to be the ONLY
   * shape `DamageRoll#evaluateCritical()` recognizes via its `instanceof DiceTerm` check and
   * positional dice-index counting. `false` for a flat numeric (unconditionally multiplied by
   * `evaluateCritical()` with no exemption check at all — SRD draws no exception for flat
   * bonuses) or a function/pool/opaque multi-dice-term fallback group (invisible to
   * `evaluateCritical()` entirely regardless of exempt status — a pre-existing characteristic
   * of that function, not a regression introduced here). Only `isCritEligible` components
   * consume or need a position in `flavorDamageDiceBySource()`'s `exemptDiceIndices`.
   */
  isCritEligible: boolean;
  /**
   * This component's EFFECTIVE existing flavor, if any. For a simple single-term component,
   * this is just that term's own flavor (or a wrapping lone `ParentheticalTerm`'s flavor,
   * inherited only when it wraps exactly one still-unflavored component). For a glued
   * multiplicative/divisive group with exactly one dice-bearing anchor (e.g. `1d6 * 2`), the
   * non-anchor "multiplier" term's own flavor wins when present — it's treated as a deliberate
   * override — falling back to the anchor's own flavor otherwise (e.g. `1d6[slashing] * 2` and
   * `1d6 * 2[fire]` both read as one flavor; `1d6[slashing] * 2[fire]` reads as fire).
   */
  existingFlavor: string | undefined;
  /** +1 or -1, from this component's own leading `+`/`-` (propagated through any wrapping negation). */
  sign: 1 | -1;
  /** A literal zero value (a bare `NumericTerm` of 0, or a simple die with count 0) — filtered out by callers the same way the old parser's zero-count dice groups were. Always `false` for a complex/opaque component (not cheaply zero-checkable without evaluating). */
  isZero: boolean;
  /** For a simple bare `NdM` die with no modifiers — lets same-shape components merge for display (`extractDiceOnlyFormula()`/`groupDamageDiceBySource()`'s grouping). `null` for anything else (modified dice, functions, pools, glued groups, flat numbers). */
  simpleDie: { faces: number; count: number } | null;
  /**
   * Re-emits this component as UNSIGNED formula text (the caller applies `sign` separately,
   * matching every other join loop in this module), inserting `flavor` in the correct position
   * — a bracket directly after a simple component's own term, or after whichever term in a
   * glued group currently holds `existingFlavor` (see that field's doc) — or omitting any
   * bracket entirely when `flavor` is `null` (a clean, marker-free display string). Any other
   * flavor present on a losing slot within a glued group is stripped, not left dangling.
   */
  emit: (flavor: string | null) => string;
}

/**
 * Parses a resolved formula into an ordered list of flavor-taggable components — the shared
 * engine behind the damage-dice marker/attribution pipeline. Reuses `splitFormulaParts()`'s
 * recursive-descent grouping technique (walk `Roll.parse()`'s flat term list, group between
 * top-level `+`/`-` boundaries, recurse one layer into a lone wrapping `ParentheticalTerm`) but
 * emits richer per-component objects instead of two joined display strings.
 *
 * Verified against Foundry's own bundled `RollParser`/`flattenTree` source (not assumed):
 * `Roll.parse()` flattens its parse tree into an INFIX list — `"1d6 * 2"` produces three flat,
 * sibling, top-level terms (`Die`, `OperatorTerm('*')`, `NumericTerm`), never a nested
 * structure. Only an explicit `(...)` in the source text produces a real `ParentheticalTerm`.
 * This means a bare `Die` term (with or without modifiers) stays a genuine top-level `DiceTerm`
 * regardless of an adjacent `*`/`/` operator — no parenthetical-wrapping/crit-index conflict to
 * avoid, so flavoring it directly (no parens) is always safe for the common case.
 *
 * Returns `null` only for a genuine parse error (`Roll.parse()` throwing) — everything else
 * (dice modifiers, multiplication/division, functions, pools, nested parens) is supported.
 */
function parseFormulaComponents(formula: string): FormulaComponent[] | null {
  // The whole body (including the `foundry.dice.terms` destructure, not just `Roll.parse()`)
  // is wrapped in one try/catch — both a genuine parse error and a missing/incomplete dice
  // runtime (e.g. a unit test's lightweight global stub) should fall through to the same
  // null-returning, marker-stripping fallback used by every caller.
  try {
    const { OperatorTerm, ParentheticalTerm, Die } = foundry.dice.terms;
    const components: FormulaComponent[] = [];

    function collect(expression: string, sign: 1 | -1): boolean {
      const terms: ReturnType<typeof Roll.parse> = Roll.parse(expression, {});

      let group: typeof terms = [];
      let groupSign = sign;

      function appendGroup(): boolean {
        if (!group.length) return true;

        // A lone wrapping Parenthetical — peel one layer and recurse; its own flavor (if any)
        // becomes the sole resulting component's flavor only when that component doesn't
        // already have its own (mirrors splitFormulaParts()'s inheritance semantics).
        if (group.length === 1 && group[0] instanceof ParentheticalTerm) {
          const wrapper = group[0];
          const before = components.length;
          if (!collect(wrapper.term, groupSign)) return false;
          if (wrapper.flavor && components.length === before + 1 && !components[before].existingFlavor) {
            components[before] = { ...components[before], existingFlavor: wrapper.flavor };
          }
          return true;
        }

        // A single bare term (Die, NumericTerm, FunctionTerm, or PoolTerm — no glue operator).
        if (group.length === 1) {
          const [term] = group;
          const isDie = term instanceof Die;
          const isZero = term instanceof foundry.dice.terms.NumericTerm
            ? term.number === 0
            : isDie && typeof term.faces === 'number' && term.modifiers.length === 0 && term.number === 0;
          const simpleDie = isDie && typeof term.faces === 'number' && term.modifiers.length === 0
            ? { faces: term.faces, count: groupSign * term.number }
            : null;
          components.push({
            isDice: !term.isDeterministic,
            isCritEligible: isDie,
            existingFlavor: term.flavor || undefined,
            sign: groupSign,
            isZero,
            simpleDie,
            emit: flavor => (flavor ? `${term.expression}[${flavor}]` : term.expression),
          });
          return true;
        }

        // A glued multiplicative/divisive group (e.g. "1d6 * 2") — "+"/"-" always start a new
        // group (see the outer loop below), so only "*"/"/" ever keep multiple terms together
        // here. Exactly one non-deterministic anchor is the common, fully-supported case: the
        // "multiplier" term's own flavor wins when present (see FormulaComponent.existingFlavor's
        // doc), falling back to the anchor's. Zero or multiple non-deterministic terms (e.g.
        // "1d6 * 1d4") is rare and has no clean single anchor to flavor directly — it falls back
        // to one opaque, parenthesized unit, the only shape here that sacrifices this group's own
        // crit-multiplication visibility (a parenthesized group is invisible to
        // `DamageRoll#evaluateCritical()`'s `instanceof DiceTerm` scan) — a deliberate, documented
        // trade for not having to guess an anchor among multiple real dice terms.
        const nonDeterministic = group.filter(term => !term.isDeterministic);
        if (nonDeterministic.length === 1) {
          const anchor = nonDeterministic[0];
          const multiplier = group.find(term => term !== anchor && !(term instanceof OperatorTerm) && term.flavor);
          const effectiveFlavor = multiplier?.flavor || anchor.flavor || undefined;
          components.push({
            isDice: true,
            isCritEligible: anchor instanceof Die,
            existingFlavor: effectiveFlavor,
            sign: groupSign,
            isZero: false,
            simpleDie: null,
            emit: flavor => group.map((term) => {
              if (term instanceof OperatorTerm) return term.operator;
              const isWinningSlot = multiplier ? term === multiplier : term === anchor;
              return flavor && isWinningSlot ? `${term.expression}[${flavor}]` : term.expression;
            }).join(' '),
          });
          return true;
        }

        const existingFlavor = group.find(term => !(term instanceof OperatorTerm) && term.flavor)?.flavor;
        components.push({
          isDice: nonDeterministic.length > 0,
          isCritEligible: false,
          existingFlavor,
          sign: groupSign,
          isZero: false,
          simpleDie: null,
          emit: (flavor) => {
            const text = group.map(term => (term instanceof OperatorTerm ? term.operator : term.expression)).join(' ');
            return flavor ? `(${text})[${flavor}]` : text;
          },
        });
        return true;
      }

      for (const term of terms) {
        if (term instanceof OperatorTerm && (term.operator === '+' || term.operator === '-')) {
          if (!appendGroup()) return false;
          group = [];
          groupSign = term.operator === '-' ? ((-sign) as 1 | -1) : sign;
        } else {
          group.push(term);
        }
      }
      return appendGroup();
    }

    return collect(formula, 1) ? components : null;
  } catch {
    return null;
  }
}

/**
 * Shared per-component term-building loop behind `flavorDiceGroups()` (blind overwrite) and
 * `mergeDiceGroupMarker()` (upsert-and-preserve) — each component's existing flavor (if any,
 * see `FormulaComponent.existingFlavor`) is passed to `computeFlavor` to decide its new one.
 * Falls back to a marker-stripped copy of `formula` (rather than leaking any marker text
 * already embedded in it) when `parseFormulaComponents()` can't parse it at all — a genuine
 * parse error, which should now be rare given how much more `parseFormulaComponents()` supports
 * than the old tuple-based walker.
 */
function transformDiceGroupFlavors(formula: string, computeFlavor: (existingFlavor: string | undefined) => string): string {
  const components = parseFormulaComponents(formula);
  if (!components) return stripMarkerFlavors(formula);

  const parts: string[] = [];
  for (const component of components) {
    if (component.isZero) continue;
    const emitted = component.emit(computeFlavor(component.existingFlavor));
    parts.push(parts.length === 0
      ? (component.sign < 0 ? `-${emitted}` : emitted)
      : `${component.sign < 0 ? '-' : '+'} ${emitted}`);
  }
  return parts.length > 0 ? parts.join(' ') : '0';
}

/**
 * Appends `[label]` directly after each top-level component in `formula` (e.g.
 * `3d6[label] + 1[label] + 1d6[label]`) so Foundry's own dice tooltip (`Roll#getTooltip()`)
 * shows a flavor label for every damage component — the same parity `_buildAttackFormula()`'s
 * bare `1d20[attackName]` gives the attack roll's tooltip.
 */
function flavorDiceGroups(formula: string, label: string): string {
  return transformDiceGroupFlavors(formula, () => label);
}

/**
 * Like `flavorDiceGroups()`, but upserts `(key, value)` into whatever marker bag (if any) each
 * component's EXISTING flavor already carries (`@constants/diceMarkerBag.mjs`'s
 * `withMarkerField()`), instead of overwriting it outright — the composability fix for the
 * `$critMultiply`/`$critExempt`/`$typed()` escape hatches (`FormulaResolver.
 * functionGrammar.mts`): nesting them in either order (`$critMultiply($typed(fire, 1d6))` or
 * `$typed(fire, $critMultiply(1d6))`) converges on the same combined bag, since each only
 * ever upserts its own key. Applies uniformly to dice AND flat components — a wholly flat
 * `$typed(fire, 3)` no longer silently loses its type, since every component (not just
 * dice-shaped ones) goes through this same merge step.
 */
function mergeDiceGroupMarker(formula: string, key: string, value: string): string {
  return transformDiceGroupFlavors(formula, existingFlavor => withMarkerField(existingFlavor, key, value));
}

/**
 * Splits a weapon's resolved damage formula into its own base components (flavor-tagged with
 * `baseLabel`) versus each contributing AE override's own components (flavor-tagged with that
 * effect's own `effectName` instead) — e.g. `2d6[Greatsword] + 1d6[+1 Flaming] + 9[Greatsword]`.
 * A component anchored on a bare `Die` stays a genuine top-level term (no parenthetical
 * wrapping) so the SRD critical-hit exception for AE-contributed "extra damage dice" ("extra
 * damage dice over and above a weapon's normal damage are never multiplied", e.g. a Flaming
 * weapon's bonus 1d6 fire) can be enforced later, explicitly, by `DamageRoll#evaluateCritical()`
 * skipping each dice group whose 0-based position (the Nth `DiceTerm` encountered, left to
 * right — see `FormulaComponent.isCritEligible`'s doc) appears in the returned
 * `exemptDiceIndices` — NOT by exploiting `Roll#alter()`'s blind skip of `ParentheticalTerm`s,
 * which would also (incorrectly) exempt any unrelated non-dice parenthetical that happens to
 * appear in the formula for other reasons, and NOT by matching each component's own `[flavor]`
 * label — a label only identifies a component's DISPLAY source (weapon name / AE name), and two
 * components from the SAME source can still need opposite crit treatment (see the escape
 * hatches below), so position is the only signal granular enough. A flat `NumericTerm`
 * component is unconditionally multiplied by `evaluateCritical()` regardless of exempt status —
 * SRD draws no exception for flat bonuses (enhancement, Strength, etc. all multiply) — and
 * never consumes a position in `exemptDiceIndices` either way.
 *
 * Positional: `RollFormulaStringField` only ever appends AE `add` changes to the end of the
 * formula (`appendRollFormulaTerm()`), so the resolved formula's components are always
 * `[...weapon's own, ...override1's, ...override2's, ...]` in that exact order — walking
 * `overrides` in reverse peels its own trailing components off the parsed list first, with no
 * need to re-parse the base formula's own text separately.
 *
 * Escape hatches: an author can invert the default exemption for a specific dice component via
 * two FormulaFamiliar functions (`FormulaResolver.functionGrammar.mts`), each upserting a
 * reserved key into the component's shared marker bag (`@constants/diceMarkerBag.mjs`) via
 * `mergeDiceGroupMarker()` — plain text, so it survives formula resolution as part of the
 * component's own flavor and is read back out (and replaced with a real display label) later by
 * this function:
 * - `$critMultiply(1d6)`, used inside an AE's own formula/change value, keeps that component
 *   eligible for crit multiplication despite being AE-sourced (positional owner !== weapon).
 * - `$critExempt(1d6)`, used inside the weapon's own base `damageFormula`, exempts that
 *   component despite being the weapon's own base dice (positional owner === weapon) —
 *   displayed with a generic "Extra Damage" label instead of the weapon's own name, since it's
 *   no longer part of the weapon's normal damage for crit purposes.
 * A marker is a no-op when it only confirms the component's already-default treatment (e.g.
 * `$critExempt` on an override's own dice, which are already exempt by default).
 *
 * **Damage type (poc.10 Story J) stays out of this function's own flavor text.** A `$typed()`
 * marker on a component (see `attributeDamageDiceGroups()`) is read for
 * `groupDamageDiceBySource()`'s display-only breakdown rows (`damageTypeLabel`), not folded
 * into the real roll's `[flavor]` tag here — this function's flavor stays dedicated to source
 * attribution only, so existing crit-marker read-back and anything else that inspects a rolled
 * die's flavor text is unaffected. Source (this function) and damage type
 * (`groupDamageDiceBySource()`) are deliberately two separate signals read off the same
 * component's marker bag, not merged into one combined flavor string.
 *
 * Falls back to `{ formula: stripMarkerFlavors(flavorDiceGroups(resolvedFormula, baseLabel)), exemptDiceIndices: [] }`
 * (single label, no split, nothing exempt, no leaked marker text) only on a genuine parse
 * error — rare now, see `parseFormulaComponents()`.
 *
 * See `groupDamageDiceBySource()` for the display-only sibling of this function — a
 * `RollModifier[]`-style breakdown list (one row per source) built from the same
 * owner/escape-hatch attribution, used by the dialog/card's dice modifier-list rows rather than
 * the real roll formula.
 */
function flavorDamageDiceBySource(
  resolvedFormula: string,
  baseLabel: string,
  overrides: { effectName: string; value: string }[],
  defaultDamageType: DamageType | null = null
): { formula: string; exemptDiceIndices: number[] } {
  const components = parseFormulaComponents(resolvedFormula);
  if (!components) return { formula: stripMarkerFlavors(flavorDiceGroups(resolvedFormula, baseLabel)), exemptDiceIndices: [] };

  const attributed = attributeDamageDiceGroups(components, baseLabel, overrides, defaultDamageType);

  // Crit-index counting mirrors DamageRoll#evaluateCritical()'s own walk exactly — only an
  // `isCritEligible` component (a genuine bare/modified Die) consumes or needs a position here.
  const exemptDiceIndices: number[] = [];
  const parts: string[] = [];
  let critIndex = 0;
  for (const { component, label, isExempt } of attributed) {
    if (component.isZero) continue;
    if (component.isCritEligible) {
      if (isExempt) exemptDiceIndices.push(critIndex);
      critIndex += 1;
    }
    const emitted = component.emit(label);
    parts.push(parts.length === 0
      ? (component.sign < 0 ? `-${emitted}` : emitted)
      : `${component.sign < 0 ? '-' : '+'} ${emitted}`);
  }

  return { formula: parts.length > 0 ? parts.join(' ') : '0', exemptDiceIndices };
}

/**
 * Shared owner/label attribution behind `flavorDamageDiceBySource()` (the real roll formula)
 * and `groupDamageDiceBySource()` (the display-only breakdown list) — see
 * `flavorDamageDiceBySource()`'s doc comment for the positional-attribution and escape-hatch
 * rules this implements. Returns one entry per component, dice AND flat alike, in formula order
 * (zero-value components included — callers filter those out themselves where it matters).
 *
 * `damageType` (poc.10 Story J) is read from the same component marker bag the crit escape
 * hatches use — both dimensions live in one shared bag (`@constants/diceMarkerBag.mjs`),
 * upserted independently by whichever of `$critMultiply`/`$critExempt`/`$typed()` resolved (see
 * `mergeDiceGroupMarker()`), so a component can carry both a crit override and a damage type at
 * once regardless of nesting order. A weapon-owned component (`owner === -1`) with no explicit
 * `$typed()` wrapping falls back to `defaultDamageType` — the dropdown-selected `damageType` on
 * the weapon's own attack action, implicitly covering whatever part of its base `damageFormula`
 * the author didn't explicitly wrap — so only an AE-contributed component with no `$typed()` of
 * its own stays `null` (no type inherited from the weapon; see
 * `WeaponAttackDataModel._buildDamageData()`'s call site).
 */
function attributeDamageDiceGroups(
  components: FormulaComponent[],
  baseLabel: string,
  overrides: { effectName: string; value: string }[],
  defaultDamageType: DamageType | null = null
): { component: FormulaComponent; label: string; isExempt: boolean; damageType: DamageType | null }[] {
  // -1 = the weapon's own contribution; otherwise an index into `overrides`. Ownership is
  // walked backward from the end (RollFormulaStringField only ever APPENDS override terms),
  // consuming however many components each override's own resolved value parses into.
  const ownerPerComponent = new Array<number>(components.length).fill(-1);
  let cursor = components.length;
  for (let i = overrides.length - 1; i >= 0 && cursor > 0; i--) {
    const overrideComponents = parseFormulaComponents(overrides[i].value) ?? [];
    for (let j = 0; j < overrideComponents.length && cursor > 0; j++) {
      cursor -= 1;
      ownerPerComponent[cursor] = i;
    }
  }

  const extraDamageLabel = game.i18n.localize('dnd35e.COMBAT.ExtraDamageDice');
  return components.map((component, idx) => {
    const owner = ownerPerComponent[idx];
    const critOverride = readCritOverride(component.existingFlavor);
    const forcedExempt = critOverride === 'exempt';
    const forcedEligible = critOverride === 'multiply';
    const isExempt = forcedExempt ? true : forcedEligible ? false : owner !== -1;
    const label = owner === -1
      ? (forcedExempt ? extraDamageLabel : baseLabel)
      : overrides[owner].effectName;
    const damageType = readDamageType(component.existingFlavor) ?? (owner === -1 ? defaultDamageType : null);
    return { component, label, isExempt, damageType };
  });
}

/**
 * Display-only counterpart to `flavorDamageDiceBySource()` — same positional/escape-hatch
 * attribution, but merges each source's own simple-dice components into its own dice-only
 * formula string (e.g. `2d6`) instead of building one flavored roll string, for use in a
 * `RollModifier[]` breakdown list (one row per contributing source) rather than the actual
 * roll. Stays dice-only (flat components are excluded, matching this function's historical
 * scope — `WeaponAttackDataModel._buildFormulaBreakdown()` builds flat-modifier breakdown rows
 * separately). One entry per distinct (label, damageType) pair that owns at least one non-zero
 * dice component, in first-appearance order — grouped by the pair rather than label alone so a
 * single source with multiple typed components (e.g. a homebrew `damageFormula` of
 * `$typed(slashing, 2d6) + $typed(fire, 1d6)`) gets one row per type instead of merging them. A
 * complex component (a glued group, function, or pool) keeps its own un-merged, marker-stripped
 * text rather than being forced into the simple `NdM`-summing path. `damageTypeLabel`
 * (localized, e.g. "Fire") is populated for any component with a `$typed()` marker, or — for a
 * weapon-owned component with no explicit wrapping — `defaultDamageType` (see
 * `attributeDamageDiceGroups()`'s doc comment); omitted (not an empty string) only for an
 * untyped AE-contributed component, matching `RollModifier.bonusTypeLabel`'s own "omitted when
 * not applicable" convention.
 */
function groupDamageDiceBySource(
  resolvedFormula: string,
  baseLabel: string,
  overrides: { effectName: string; value: string }[],
  defaultDamageType: DamageType | null = null
): { label: string; formula: string; damageTypeLabel?: string }[] {
  const components = parseFormulaComponents(resolvedFormula);
  if (!components) {
    const diceOnly = extractDiceOnlyFormula(resolvedFormula);
    return diceOnly ? [{ label: baseLabel, formula: diceOnly }] : [];
  }

  const attributed = attributeDamageDiceGroups(components, baseLabel, overrides, defaultDamageType);

  const order: string[] = [];
  const labelByKey = new Map<string, { label: string; damageType: DamageType | null }>();
  const simpleDiceByKey = new Map<string, Map<number, number>>();
  const opaquePartsByKey = new Map<string, string[]>();

  for (const { component, label, damageType } of attributed) {
    if (!component.isDice || component.isZero) continue;
    const key = `${label}\u0000${damageType ?? ''}`;
    if (!labelByKey.has(key)) {
      labelByKey.set(key, { label, damageType });
      simpleDiceByKey.set(key, new Map());
      opaquePartsByKey.set(key, []);
      order.push(key);
    }
    if (component.simpleDie) {
      const faceCounts = simpleDiceByKey.get(key)!;
      faceCounts.set(component.simpleDie.faces, (faceCounts.get(component.simpleDie.faces) ?? 0) + component.simpleDie.count);
    } else {
      const emitted = component.emit(null);
      opaquePartsByKey.get(key)!.push(component.sign < 0 ? `-${emitted}` : emitted);
    }
  }

  return order
    .map((key) => {
      const { label, damageType } = labelByKey.get(key)!;
      const diceTerms = [...simpleDiceByKey.get(key)!.entries()]
        .filter(([, count]) => count !== 0)
        .sort(([a], [b]) => a - b)
        .map(([faces, count]) => `${count}d${faces}`);
      const formula = [...diceTerms, ...opaquePartsByKey.get(key)!].join(' + ');
      return {
        label,
        formula,
        ...(damageType && { damageTypeLabel: game.i18n.localize(damageType) }),
      };
    })
    .filter(({ formula }) => formula);
}

export {
  buildD20Formula,
  combineDiceFormula,
  extractDiceOnlyFormula,
  extractFlatModifier,
  flavorDamageDiceBySource,
  flavorDiceGroups,
  flavorTerm,
  groupDamageDiceBySource,
  mergeDiceGroupMarker,
  splitFormulaParts,
};

export type { FormulaParts };
