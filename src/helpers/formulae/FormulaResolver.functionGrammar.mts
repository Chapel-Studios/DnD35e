/**
 * FormulaResolver — array/string function grammar (poc §7.2b).
 *
 * Parses and resolves `$contains(...)`, `$find(...)`, `$any(...)`, `$count(...)`,
 * and `$stringContains(...)` blocks — a small set of `$`-prefixed pre-processing
 * functions layered on top of the plain `#context.property` substitution grammar,
 * same tier as `$conditional(...)`. `$contains`/`$find`/`$any`/`$count` operate on
 * array-typed FieldAspects (`FieldAspect.type === 'array'`, see `schemaWalker.mts`);
 * `$stringContains` is a plain two-operand substring check with no array involved.
 *
 * `$fromFeet(n)`/`$fromMeters(n)` are unrelated unit-conversion helpers sharing the
 * same `$name(...)` pre-processing tier: canonical storage for all distance-bearing
 * fields is squares (1 square = 5 ft = 1.5 m), so these let a value formula be
 * authored in real-world units (e.g. `$fromFeet(60)` for a 60 ft speed) and resolve
 * to the stored square count. Result is rounded to 2 decimal places.
 *
 * `$fromKg(n)` is the weight equivalent: canonical storage for weight-bearing fields
 * is pounds, so this lets a value formula be authored in kilograms and resolve to the
 * stored pound value (1 kg = 2 lbs, mirroring `settingsStore.mts`'s weight conversion).
 * Result is rounded to 2 decimal places, matching the weight display precision.
 *
 * `#it` is a bound per-element variable valid only inside a `$contains`/`$find`/
 * `$any`/`$count` predicate argument — resolved per-element against a synthetic
 * FamiliarSchema built from the array's `arrayElement.elementFields` (object-array
 * shapes only; primitive arrays support 2-arg membership only, no predicate).
 *
 * This module is called from `FormulaResolver.aspectResolution.mts`'s `resolveFormula()`
 * as a pre-pass alongside `$conditional` resolution (after it, so a function block can
 * appear inside a `$conditional` branch and vice versa). Kept decoupled from
 * `aspectResolution.mts` (all lookups injected via `FunctionGrammarHelpers`) to avoid a
 * circular import, mirroring `FormulaResolver.conditionalGrammar.mts`'s pattern.
 *
 * Split out from FormulaResolver.mts to keep each grammar self-contained.
 * Consumed by FormulaResolver.mts as static methods.
 *
 * @module
 */
import { roundToDecimal } from '@helpers/math.mjs';

import { findMatchingParen, splitTopLevelArgs } from './FormulaResolver.parenUtils.mjs';
import type { FunctionBlock, FunctionBlockError, FunctionName } from './FormulaResolver.types.mjs';
import type { DocumentContext } from './registry.mjs';
import { walkFields } from './schemaWalker.mjs';
import type { AspectGroup, FamiliarSchema, FieldAspect } from './types.mjs';

/** 1 square = 5 ft = 1.5 m (SRD's official metric conversion) — mirrors `settingsStore.mts`. */
const FEET_PER_SQUARE = 5;
const METERS_PER_SQUARE = 1.5;
/** 1 kg = 2 lbs — mirrors `settingsStore.mts`'s weight conversion factor. */
const LBS_PER_KG = 2;

/**
 * Functions/helpers injected by the caller (`resolveFormula`) so this module never
 * imports from `FormulaResolver.aspectResolution.mts` directly — avoids a circular
 * import (aspectResolution.mts → functionGrammar.mts → aspectResolution.mts).
 */
export interface FunctionGrammarHelpers {
  getFieldAspect: (schema: FamiliarSchema, context: string, path: string[]) => FieldAspect | null;
  getNestedValue: (obj: object, dottedPath: string) => unknown;
  resolveContextDocData: (
    context: string,
    familiarSchema: FamiliarSchema,
    documentDataMap: Record<string, DocumentContext>
  ) => DocumentContext | undefined;
  /** Fully resolves a sub-formula, optionally merging in an extra (per-element `it`) schema/data layer. */
  resolveSubFormula: (
    text: string,
    extraSchema?: FamiliarSchema,
    extraDataMap?: Record<string, DocumentContext>
  ) => string;
  evaluateCondition: (resolvedCondition: string) => boolean;
  /**
   * poc §7.2c — resolves a per-element familiar builder for a heterogeneous collection
   * (`#self.items`/`#self.weapons`/`#self.equipment`), keyed by the live element's own
   * `.type`. Injected (rather than imported directly) to avoid a runtime import cycle
   * with `registry.mts` — see `familiarBuilderRegistry.mts`'s module docstring.
   */
  getFamiliarBuilder: (
    documentType: foundry.CONST.DocumentType,
    subtype: string
  ) => ((context?: DocumentContext) => AspectGroup) | undefined;
}

const FUNCTION_OPEN_REGEX = /(?<!\\)\$(contains|find|any|count|stringcontains|fromfeet|frommeters|fromkg)\s*\(/gi;
const PROJECTION_REGEX = /^\.([\p{L}\p{N}_]+)/u;
const IT_REFERENCE_REGEX = /(?<!\\)#it(?![\p{L}\p{N}_])/u;
const BARE_VARIABLE_REGEX = /^#([\p{L}\p{N}_]+)((?:\.[\p{L}\p{N}_]+)*)$/u;

const CANONICAL_NAMES: Record<string, FunctionName> = {
  contains: 'contains',
  find: 'find',
  any: 'any',
  count: 'count',
  stringcontains: 'stringContains',
  fromfeet: 'fromFeet',
  frommeters: 'fromMeters',
  fromkg: 'fromKg',
};

/** Valid top-level argument counts per function. */
const FUNCTION_ARG_COUNTS: Record<FunctionName, number[]> = {
  contains: [2],
  find: [2],
  any: [1, 2],
  count: [1, 2],
  stringContains: [2],
  fromFeet: [1],
  fromMeters: [1],
  fromKg: [1],
};

/**
 * Find all `$contains(...)`/`$find(...)`/`$any(...)`/`$count(...)`/`$stringContains(...)`
 * blocks in a formula string. Malformed blocks are still returned (with `.error` set) so
 * validation and resolution can handle them explicitly rather than throwing.
 */
export function findFunctionBlocks(formula: string): FunctionBlock[] {
  const blocks: FunctionBlock[] = [];
  const openRegex = new RegExp(FUNCTION_OPEN_REGEX.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = openRegex.exec(formula)) !== null) {
    const startIndex = match.index;
    const name = CANONICAL_NAMES[match[1].toLowerCase()];
    const openParenIndex = match.index + match[0].length - 1;
    const closeParenIndex = findMatchingParen(formula, openParenIndex);

    if (closeParenIndex === -1) {
      blocks.push({
        raw: formula.substring(startIndex),
        startIndex,
        endIndex: formula.length,
        name,
        args: [],
        error: 'unbalancedParens',
      });
      break;
    }

    const innerText = formula.substring(openParenIndex + 1, closeParenIndex);
    const args = splitTopLevelArgs(innerText);

    let endIndex = closeParenIndex + 1;
    let projection: string | undefined;
    let error: FunctionBlockError | undefined;

    if (!FUNCTION_ARG_COUNTS[name].includes(args.length)) {
      error = 'argCount';
    }

    if (name === 'find') {
      const projMatch = PROJECTION_REGEX.exec(formula.substring(endIndex));
      if (projMatch) {
        projection = projMatch[1];
        endIndex += projMatch[0].length;
      } else {
        error ??= 'missingProjection';
      }
    }

    blocks.push({
      raw: formula.substring(startIndex, endIndex),
      startIndex,
      endIndex,
      name,
      args,
      ...(projection !== undefined && { projection }),
      ...(error && { error }),
    });

    openRegex.lastIndex = endIndex;
  }

  return blocks;
}

/** Strips one layer of matching quotes ('...' or "...") — returns null if `text` isn't a quoted literal. */
function matchQuotedLiteral(text: string): string | null {
  if (text.length < 2) return null;
  const first = text[0];
  const last = text[text.length - 1];
  if ((first === '"' || first === '\'') && last === first) {
    return text.slice(1, -1);
  }
  return null;
}

/** Resolves a scalar operand: a quoted literal is unwrapped as-is, otherwise fully resolved as a sub-formula. */
function resolveOperand(text: string, resolveSubFormula: FunctionGrammarHelpers['resolveSubFormula']): string {
  const trimmed = text.trim();
  const quoted = matchQuotedLiteral(trimmed);
  if (quoted !== null) return quoted;
  return resolveSubFormula(trimmed);
}

/** Parses a bare `#context.path` reference — the array argument must be nothing else (no operators, no literals). */
function parseBareArrayReference(text: string): { context: string; path: string[] } | null {
  const match = BARE_VARIABLE_REGEX.exec(text.trim());
  if (!match) return null;
  const context = match[1];
  const path = match[2] ? match[2].slice(1).split('.') : [];
  return { context, path };
}

/**
 * Evaluate a `#it.*` predicate against a single object-array element.
 * Builds a synthetic one-context FamiliarSchema (`it`) from the array's cached
 * `arrayElement.elementFields`, then fully resolves + evaluates the predicate
 * text against it (merged with the outer schema/data, so `#self.*`/etc. remain
 * usable alongside `#it.*` inside the same predicate).
 */
function evaluatePredicateForElement(
  predicateText: string,
  elementFields: Record<string, foundry.data.fields.DataField>,
  element: object,
  helpers: FunctionGrammarHelpers
): boolean {
  const itGroup: AspectGroup = {};
  walkFields(elementFields, element as unknown as DocumentContext, '', itGroup, []);
  const itSchema: FamiliarSchema = { it: { properties: itGroup } };
  const itDataMap: Record<string, DocumentContext> = { it: element as unknown as DocumentContext };

  const resolved = helpers.resolveSubFormula(predicateText, itSchema, itDataMap);
  try {
    return helpers.evaluateCondition(resolved);
  } catch {
    return false;
  }
}

/**
 * poc §7.2c — evaluate a `#it.*` predicate against a single heterogeneous-collection
 * element (e.g. one item from `#self.items`). Unlike `evaluatePredicateForElement`
 * (one shared `elementFields` shape for the whole array), the `it` schema here is
 * resolved per-element via the element's own registered familiar builder
 * (`getFamiliarBuilder(documentType, element.type)`) — an element whose type has no
 * registered builder (or a predicate referencing a field that type doesn't have)
 * simply fails to resolve that variable, which `evaluateCondition` treats as a
 * non-match rather than throwing.
 */
function evaluatePredicateForHeterogeneousElement(
  predicateText: string,
  documentType: foundry.CONST.DocumentType,
  element: object,
  helpers: FunctionGrammarHelpers
): boolean {
  const subtype = (element as { type?: string }).type;
  const builder = subtype ? helpers.getFamiliarBuilder(documentType, subtype) : undefined;
  const itGroup: AspectGroup = builder ? builder(element as DocumentContext) : {};
  const itSchema: FamiliarSchema = { it: { properties: itGroup } };
  const itDataMap: Record<string, DocumentContext> = { it: element as unknown as DocumentContext };

  const resolved = helpers.resolveSubFormula(predicateText, itSchema, itDataMap);
  try {
    return helpers.evaluateCondition(resolved);
  } catch {
    return false;
  }
}

/** Resolve a single, already-structurally-valid `FunctionBlock` to its literal text result. */
function resolveFunctionBlock(
  block: FunctionBlock,
  familiarSchema: FamiliarSchema,
  documentDataMap: Record<string, DocumentContext>,
  helpers: FunctionGrammarHelpers
): string {
  if (block.name === 'stringContains') {
    const left = resolveOperand(block.args[0], helpers.resolveSubFormula);
    const right = resolveOperand(block.args[1], helpers.resolveSubFormula);
    return String(left.includes(right));
  }

  // $fromFeet(n)/$fromMeters(n) — unit-conversion helpers for authoring values (e.g. an
  // AE change's value formula) in real-world units, converted to the canonical stored
  // unit (squares) at resolution time. A non-numeric operand resolves to '0' rather than
  // throwing, matching the rest of this module's never-throw fallback convention.
  if (block.name === 'fromFeet' || block.name === 'fromMeters') {
    const resolved = resolveOperand(block.args[0], helpers.resolveSubFormula);
    const value = Number(resolved);
    if (!Number.isFinite(value)) return '0';
    const perSquare = block.name === 'fromFeet' ? FEET_PER_SQUARE : METERS_PER_SQUARE;
    return String(roundToDecimal(value / perSquare, 2));
  }

  // $fromKg(n) — same unit-conversion pre-processing tier, for weight-bearing fields
  // (canonical stored unit is pounds). Non-numeric operand falls back to '0'.
  if (block.name === 'fromKg') {
    const resolved = resolveOperand(block.args[0], helpers.resolveSubFormula);
    const value = Number(resolved);
    if (!Number.isFinite(value)) return '0';
    return String(roundToDecimal(value * LBS_PER_KG, 2));
  }

  // Array functions: contains / find / any / count — a runtime miss (missing context,
  // unresolvable path, wrong aspect type, not actually an array) resolves to a sensible
  // default rather than leaving raw text behind — only *structural* parse errors do that.
  const fallback = block.name === 'find' ? '' : block.name === 'count' ? '0' : 'false';

  const ref = parseBareArrayReference(block.args[0]);
  if (!ref) return fallback;

  const docData = helpers.resolveContextDocData(ref.context, familiarSchema, documentDataMap);
  if (!docData) return fallback;

  const aspect = helpers.getFieldAspect(familiarSchema, ref.context, ref.path);
  if (!aspect || aspect.type !== 'array') return fallback;

  const rawValue = helpers.getNestedValue(docData, aspect.accessPath);
  // poc §7.2c: `#self.items`'s accessPath (`items`) resolves to a live Foundry
  // `EmbeddedCollection` (Map-based, not a plain Array) — accept any iterable and
  // materialize it, alongside the existing plain-Array support for schema arrays.
  let rawArray: unknown[];
  if (Array.isArray(rawValue)) {
    rawArray = rawValue;
  } else if (rawValue && typeof (rawValue as Iterable<unknown>)[Symbol.iterator] === 'function') {
    rawArray = [...(rawValue as Iterable<unknown>)];
  } else {
    return fallback;
  }

  // Filtered sub-collections (`#self.weapons`/`#self.equipment`) pre-filter by element type.
  if (aspect.arrayElement?.kind === 'heterogeneous' && aspect.arrayElement.filterTypes?.length) {
    const filterTypes = aspect.arrayElement.filterTypes;
    rawArray = rawArray.filter(el => filterTypes.includes((el as { type?: string })?.type ?? ''));
  }

  const predicateArg = block.args.length > 1 ? block.args[1] : undefined;
  const hasPredicate = predicateArg !== undefined && IT_REFERENCE_REGEX.test(predicateArg);

  const matchesPredicate = (element: unknown): boolean => {
    if (!hasPredicate) return true;
    if (typeof element !== 'object' || element === null) return false;
    if (aspect.arrayElement?.kind === 'heterogeneous') {
      return evaluatePredicateForHeterogeneousElement(predicateArg!, aspect.arrayElement.documentType, element, helpers);
    }
    if (aspect.arrayElement?.kind !== 'object') return false;
    return evaluatePredicateForElement(predicateArg!, aspect.arrayElement.elementFields, element, helpers);
  };

  switch (block.name) {
    case 'any':
      return block.args.length === 1
        ? String(rawArray.length > 0)
        : String(rawArray.some(matchesPredicate));

    case 'count':
      return block.args.length === 1
        ? String(rawArray.length)
        : String(rawArray.filter(matchesPredicate).length);

    case 'contains':
      if (!hasPredicate) {
        const target = resolveOperand(predicateArg ?? '', helpers.resolveSubFormula);
        return String(rawArray.some(el => String(el) === target));
      }
      return String(rawArray.some(matchesPredicate));

    case 'find': {
      const found = rawArray.find(matchesPredicate);
      if (found === undefined || typeof found !== 'object' || found === null || !block.projection) return '';
      const projected = helpers.getNestedValue(found, block.projection);
      return projected !== undefined && projected !== null ? String(projected) : '';
    }

    default:
      return fallback;
  }
}

/**
 * Resolve all `$contains`/`$find`/`$any`/`$count`/`$stringContains` blocks in `formula`,
 * replacing each with its final literal result. Unlike `$conditional` (a branch selector
 * that leaves the winning branch unresolved for the caller's own substitution pass),
 * these fully resolve to a literal — there's no further pass needed for the block itself.
 */
export function resolveFunctionBlocks(
  formula: string,
  familiarSchema: FamiliarSchema,
  documentDataMap: Record<string, DocumentContext>,
  helpers: FunctionGrammarHelpers
): string {
  const blocks = findFunctionBlocks(formula);
  if (blocks.length === 0) return formula;

  let result = formula;
  // Process in reverse order so earlier blocks' indices stay valid as we splice.
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    // Malformed block — leave raw/unresolved rather than guessing.
    if (block.error) continue;

    const resolved = resolveFunctionBlock(block, familiarSchema, documentDataMap, helpers);
    result = result.substring(0, block.startIndex) + resolved + result.substring(block.endIndex);
  }

  return result;
}
