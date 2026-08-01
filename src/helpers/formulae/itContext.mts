/**
 * poc §7.2b — shared `#it` context resolution for validation + autocomplete.
 *
 * Builds a synthetic `it` FamiliarContext scoped to an object array's element
 * schema (`FieldAspect.arrayElement.elementFields`), given the raw
 * `#context.path` text of a `$contains`/`$find`/`$any`/`$count` call's first
 * (array-reference) argument. Schema-only (no live document) — used where
 * there's no specific array *element* to resolve live values from, just the
 * shape:
 * - `FormulaResolver.validation.mts` — so `#it.*` inside a well-formed
 *   predicate validates against the array's element schema instead of
 *   surfacing a false "unknown context" error.
 * - `useFormulaEditor.mts` — so `#it.*` autocomplete suggestions appear while
 *   the caret sits inside an open predicate argument.
 *
 * Resolving `#it`'s live *value* during actual formula resolution is a
 * separate concern handled by `evaluatePredicateForElement` in
 * `FormulaResolver.functionGrammar.mts`, which builds its own per-element
 * context from a real array element instance.
 *
 * @module
 */
import { getFieldAspect } from './FormulaResolver.aspectResolution.mjs';
import type { ContextDocumentType } from './registry.mjs';
import { buildMergedFamiliarContext, getRegisteredSubtypes } from './registry.mjs';
import { walkFields } from './schemaWalker.mjs';
import type { AspectGroup, FamiliarContext, FamiliarSchema } from './types.mjs';

const BARE_VARIABLE_REGEX = /^#([\p{L}\p{N}_]+)((?:\.[\p{L}\p{N}_]+)*)$/u;
const FUNCTION_NAME_BEFORE_PAREN_REGEX = /\$(contains|find|any|count)\s*$/iu;

/**
 * Given the raw text of a `$contains`/`$find`/`$any`/`$count` call's first
 * argument (e.g. `#self.senses` or `#self.items`), resolve a synthetic `it`
 * FamiliarContext for the predicate. Returns `null` when the argument isn't a
 * bare `#context.path` reference, or doesn't resolve to an array aspect at all.
 *
 * - `object` kind (e.g. `senses`/`attacks`): scoped to that array's single shared
 *   element schema.
 * - `heterogeneous` kind (poc §7.2c, `#self.items`/`#self.weapons`/`#self.equipment`):
 *   scoped to the *union* of every relevant Item subtype's schema — reuses
 *   `buildMergedFamiliarContext`, pre-filtered to `arrayElement.filterTypes` when
 *   present, otherwise every registered subtype for that document type. Not every
 *   union-offered field exists on every element at runtime — same expectation as
 *   `AspectPicker`'s existing cross-subtype union display.
 */
export function buildItFamiliarContext(arrayRefText: string, contexts: FamiliarSchema): FamiliarContext | null {
  const match = BARE_VARIABLE_REGEX.exec(arrayRefText.trim());
  if (!match) return null;

  const contextName = match[1];
  const path = match[2] ? match[2].slice(1).split('.') : [];
  const aspect = getFieldAspect(contexts, contextName, path);
  if (!aspect || aspect.type !== 'array' || !aspect.arrayElement) return null;

  if (aspect.arrayElement.kind === 'heterogeneous') {
    const { documentType, filterTypes } = aspect.arrayElement;
    const subtypes = filterTypes as ContextDocumentType[] | undefined ?? getRegisteredSubtypes(documentType);
    return buildMergedFamiliarContext(documentType, subtypes);
  }

  if (aspect.arrayElement.kind !== 'object') return null;

  const { elementFields, elementAccessPath, localizationPrefixes } = aspect.arrayElement;
  const itGroup: AspectGroup = {};
  walkFields(elementFields, undefined, elementAccessPath, itGroup, localizationPrefixes);
  return { properties: itGroup };
}

/**
 * Find the position of the '(' that opens the innermost still-open (unclosed
 * so far) call enclosing `cursorPosition` — walks backward tracking paren
 * depth, ignoring backslash-escaped parens. Returns -1 if the cursor isn't
 * inside any such open call.
 */
function findEnclosingOpenParen(text: string, cursorPosition: number): number {
  let depth = 0;
  for (let i = cursorPosition - 1; i >= 0; i--) {
    let backslashes = 0;
    let j = i - 1;
    while (j >= 0 && text[j] === '\\') { backslashes++; j--; }
    if (backslashes % 2 === 1) continue; // this char is itself escaped — not syntax

    const ch = text[i];
    if (ch === ')') depth++;
    else if (ch === '(') {
      if (depth === 0) return i;
      depth--;
    }
  }
  return -1;
}

/**
 * While the caret sits inside an open `$contains(`/`$find(`/`$any(`/`$count(`
 * call, past its first (array-reference) argument, resolve a synthetic `it`
 * FamiliarContext for autocomplete — so `#it.*` suggestions appear scoped to
 * that array's element schema. Returns `null` everywhere else (including
 * `$stringContains`, which has no predicate argument at all).
 */
export function resolveItAutocompleteContext(
  formula: string,
  cursorPosition: number,
  contexts: FamiliarSchema
): FamiliarContext | null {
  const openParenIndex = findEnclosingOpenParen(formula, cursorPosition);
  if (openParenIndex === -1) return null;
  if (!FUNCTION_NAME_BEFORE_PAREN_REGEX.test(formula.substring(0, openParenIndex))) return null;

  // The caret must be past the first top-level comma (i.e. no longer inside
  // the array-reference argument itself) for `#it` to be in scope.
  let depth = 0;
  let firstCommaIndex = -1;
  for (let i = openParenIndex + 1; i < cursorPosition; i++) {
    const ch = formula[i];
    if (ch === '\\') { i++; continue; }
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) { firstCommaIndex = i; break; }
  }
  if (firstCommaIndex === -1) return null;

  const arrayRefText = formula.substring(openParenIndex + 1, firstCommaIndex);
  return buildItFamiliarContext(arrayRefText, contexts);
}
