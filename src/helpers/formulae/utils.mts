/**
 * FormulaFormGroup Utility Functions
 * Editor-support: HTML highlighting, autocomplete, and localized-display logic.
 * Core parsing/resolution/validation logic lives in FormulaResolver.mts.
 */
import type { FormulaDataSource } from './FormulaData.mjs';
import { FormulaData } from './FormulaData.mjs';
import { FormulaResolver } from './FormulaResolver.mjs';
import type { ConditionalBlockError, FunctionBlockError } from './FormulaResolver.types.mjs';
import type { DocumentContext } from './registry.mjs';
import { buildContextFromFormula } from './registry.mjs';
import { normalizeLabel } from './schemaWalker.mjs';
import type {
  AspectGroup,
  AutocompleteOption,
  FamiliarSchema,
  FieldAspect,
  FormulaFieldData,
  FormulaToken,
  FormulaVariable,
  ValidationError,
} from './types.mjs';
import { isFieldAspect } from './types.mjs';

/**
 * Translate a formula from canonical storage form to the current locale's display form.
 *
 * - `#self.hardness`  →  `#Self.Hardness`   (English)
 * - `#self.hardness`  →  `#Siebie.Twardość` (Polish)
 *
 * Context and property names are normalized with `normalizeLabel` (PascalCase,
 * spaces removed) so multi-word labels like "Hit Points" become `HitPoints`.
 * Custom quoted paths (`#self.'raw.path'`) are left unchanged.
 * Segments that cannot be resolved are left as-is.
 */
export function localizeFormula(formula: string, schema: FamiliarSchema): string {
  const variables = FormulaResolver.extractVariables(formula);
  if (!variables.length) return formula;

  let result = formula;
  // Process in reverse order to preserve string indices
  for (let i = variables.length - 1; i >= 0; i--) {
    const v = variables[i];
    if (v.customAccessPath !== undefined) continue;

    // Find context entry: direct key or alias
    const ctxEntry = Object.entries(schema).find(([k, ctx]) =>
      k === v.context || ctx.aliases?.includes(v.context)
    );
    if (!ctxEntry) continue;
    const [, ctx] = ctxEntry;
    const localCtx = normalizeLabel(ctx.display) ?? v.context;

    // Walk path, translating each canonical key to its localized display name
    let current: unknown = ctx.properties;
    const localPath: string[] = [];
    for (const seg of v.path) {
      if (typeof current !== 'object' || current === null) { localPath.push(seg); continue; }
      const obj = current as Record<string, unknown>;
      const entry = obj[seg];
      if (entry === undefined) { localPath.push(seg); break; }
      if (isFieldAspect(entry)) {
        localPath.push(normalizeLabel(entry.display) ?? seg);
        current = null;
      } else {
        const branch = entry as AspectGroup;
        localPath.push(normalizeLabel(branch._display) ?? seg);
        current = branch;
      }
    }

    const localized = localPath.length ? `#${localCtx}.${localPath.join('.')}` : `#${localCtx}`;
    result = result.substring(0, v.startIndex) + localized + result.substring(v.endIndex);
  }
  return result;
}

/**
 * Translate a formula from localized display form back to canonical storage form.
 *
 * - `#Self.Hardness`   →  `#self.hardness`  (English)
 * - `#Siebie.Twardość` →  `#self.hardness`  (Polish)
 *
 * Matches each segment against `normalizeLabel(entry.display)`. Falls through
 * to the canonical key if no display match is found, so this is safe to call
 * on formulas that are already canonical.
 */
export function canonicalizeFormula(formula: string, schema: FamiliarSchema): string {
  const variables = FormulaResolver.extractVariables(formula);
  if (!variables.length) return formula;

  let result = formula;
  for (let i = variables.length - 1; i >= 0; i--) {
    const v = variables[i];
    if (v.customAccessPath !== undefined) continue;

    // Find canonical context key: direct match, localized display match, or alias
    const ctxKV = Object.entries(schema).find(([k, ctx]) =>
      k === v.context
      || (normalizeLabel(ctx.display) ?? k) === v.context
      || ctx.aliases?.includes(v.context)
    );
    if (!ctxKV) continue;
    const [canonCtx, ctxSchema] = ctxKV;

    // Walk path, mapping each localized segment back to its canonical key
    let current: unknown = ctxSchema.properties;
    const canonPath: string[] = [];
    for (const seg of v.path) {
      if (typeof current !== 'object' || current === null) { canonPath.push(seg); break; }
      const obj = current as Record<string, unknown>;

      // 1. Direct key match (already canonical or same-locale)
      if (seg in obj) {
        const entry = obj[seg];
        canonPath.push(seg);
        current = isFieldAspect(entry) ? null : (entry as AspectGroup);
        continue;
      }

      // 2. Leaf alias fallback (FieldAspect.aliases)
      const leafAlias = Object.entries(obj).find(([, v2]) =>
        isFieldAspect(v2) && v2.aliases?.includes(seg)
      );
      if (leafAlias) {
        canonPath.push(leafAlias[0]);
        current = null;
        continue;
      }

      // 3. Branch alias fallback (AspectGroup._aliases)
      const branchAlias = Object.entries(obj).find(([, v2]) =>
        typeof v2 === 'object' && v2 !== null && !isFieldAspect(v2)
        && (v2 as { _aliases?: string[] })._aliases?.includes(seg)
      );
      if (branchAlias) {
        canonPath.push(branchAlias[0]);
        current = branchAlias[1] as AspectGroup;
        continue;
      }

      // 4. Localized display name → canonical key
      let matched = false;
      for (const [k, v2] of Object.entries(obj)) {
        if (k.startsWith('_')) continue;
        const localKey = isFieldAspect(v2)
          ? (normalizeLabel((v2 as FieldAspect).display) ?? k)
          : (normalizeLabel((v2 as AspectGroup)._display) ?? k);
        if (localKey === seg) {
          canonPath.push(k);
          current = isFieldAspect(v2) ? null : (v2 as AspectGroup);
          matched = true;
          break;
        }
      }
      if (!matched) { canonPath.push(seg); break; }
    }

    const canonical = canonPath.length ? `#${canonCtx}.${canonPath.join('.')}` : `#${canonCtx}`;
    result = result.substring(0, v.startIndex) + canonical + result.substring(v.endIndex);
  }
  return result;
}

/**
 * Display-only transform for the single-line `FormulaFormGroup` field: collapse real
 * line breaks AND any indentation/extra whitespace (from the multiline editor modal,
 * poc §7.10 — users may indent `when()`/`else()` clauses onto their own lines for
 * readability) down to single spaces between tokens, so a multiline/indented formula
 * still renders as a clean single line in a plain `<input>`. Whitespace *inside*
 * quoted string literals (`'...'`/`"..."`) is preserved exactly, since that's real
 * content, not formatting. The stored/canonical formula keeps its real newlines and
 * indentation — this only affects what's shown at rest in the collapsed single-line
 * field, not the multiline modal's own editing surface (which always shows the real
 * value).
 */
export function collapseFormulaLineBreaks(formula: string): string {
  let result = '';
  let inQuote: '\'' | '"' | null = null;
  let pendingSpace = false;

  for (const ch of formula) {
    if (inQuote) {
      result += ch;
      if (ch === inQuote) inQuote = null;
      continue;
    }
    if (ch === '\'' || ch === '"') {
      if (pendingSpace && result.length > 0) result += ' ';
      pendingSpace = false;
      inQuote = ch;
      result += ch;
      continue;
    }
    if (/\s/.test(ch)) {
      pendingSpace = true;
      continue;
    }
    if (pendingSpace && result.length > 0) result += ' ';
    pendingSpace = false;
    result += ch;
  }

  return result;
}

/** Configuration for `getAutocompleteOptions()`. */
export interface GetAutocompleteOptionsConfig {
  /**
   * Override how `fullPath` is constructed for each option.
   * Default: `(ctx, prefix, key) => \`#\${ctx}.\${prefix}\${key}\`` (formula syntax).
   */
  formatFullPath?: (contextName: string, pathPrefix: string, key: string) => string;
}

const defaultFormatFullPath = (ctx: string, prefix: string, key: string): string => `#${ctx}.${prefix}${key}`;

/**
 * Canonical `$`-prefixed keywords offered by the `$` autocomplete dropdown (poc §7.2b).
 * `conditional` is the control-flow `$conditional(when()else())` construct;
 * the other five are the array/string query functions. Both groups share the
 * exact same insertion shape (`$name(`), so they're offered from one list.
 */
const FUNCTION_AUTOCOMPLETE_NAMES = [
  'conditional',
  'contains',
  'find',
  'any',
  'count',
  'stringContains',
  'fromFeet',
  'fromMeters',
  'fromKg',
] as const;

/**
 * Autocomplete options for the `$`-keyword dropdown (`$conditional`/`$contains`/
 * `$find`/`$any`/`$count`/`$stringContains`) — mirrors the `#` context dropdown's
 * UX (triggered by typing `$`, filtered by what's typed so far) but the option
 * list is a small fixed set rather than schema-driven, since these keywords aren't
 * `FamiliarSchema` properties. Selecting an option inserts `$name(` with the cursor
 * placed right after the open paren, ready to type the next argument (which itself
 * triggers the normal `#` dropdown on the next keystroke).
 */
export function getFunctionAutocompleteOptions(partialText: string): AutocompleteOption[] {
  const query = partialText.toLowerCase();
  return FUNCTION_AUTOCOMPLETE_NAMES
    .filter(name => name.toLowerCase().startsWith(query))
    .map(name => ({
      path: name,
      display: game.i18n.localize(`dnd35e.Formula.Functions.${name}.label`),
      value: null,
      isLeaf: true,
      fullPath: `$${name}(`,
      accessPath: game.i18n.localize(`dnd35e.Formula.Functions.${name}.hint`),
    }));
}

/**
 * Get autocomplete options for the current context and path
 * Provides intelligent filtering and sorting
 */
export function getAutocompleteOptions(
  currentText: string,
  context: FamiliarSchema,
  config?: GetAutocompleteOptionsConfig
): AutocompleteOption[] {
  if (!context) return [];
  const formatFull = config?.formatFullPath ?? defaultFormatFullPath;
  // Remove leading # if present
  const text = currentText.startsWith('#') ? currentText.substring(1) : currentText;
  const parts = text.split('.');
  const contextName = parts[0];
  const partialPath = parts.slice(1);

  const options: AutocompleteOption[] = [];

  // If no context specified yet, show available contexts (primary names only, not aliases)
  // Aliases still work for resolution (e.g., #item. resolves to self) but don't clutter the menu
  if (!contextName || parts.length === 1) {
    const seenOptions = new Set<string>();

    for (const [name, schema] of Object.entries(context)) {
      // Check if partial input matches the primary name, display label, or any alias
      const displayName = schema.display ?? name;
      const matchesPrimary = !contextName
        || name.toLowerCase().startsWith(contextName.toLowerCase())
        || displayName.toLowerCase().startsWith(contextName.toLowerCase());
      const matchesAlias = !matchesPrimary && schema.aliases?.some(
        alias => alias.toLowerCase().startsWith(contextName.toLowerCase())
      );

      if (matchesPrimary || matchesAlias) {
        if (!seenOptions.has(name)) {
          // Show all aliases EXCEPT the display name itself to avoid redundancy
          const otherAliases = schema.aliases?.filter(a => a !== displayName) ?? [];
          const aliasHint = otherAliases.length ? ` (${otherAliases.join(', ')})` : '';
          // Default to localized display identifier; aliases are accepted fallbacks.
          const insertCtx = schema.display ? (normalizeLabel(schema.display) ?? name) : name;
          options.push({
            path: insertCtx,
            display: `${displayName}${aliasHint}`,
            value: null,
            isLeaf: false,
            fullPath: formatFull(insertCtx, '', ''),
          });
          seenOptions.add(name);
        }
      }
    }

    // Sort by exact match first, then alphabetically
    return options.sort((a, b) => {
      if (contextName) {
        const aExact = a.path.toLowerCase() === contextName.toLowerCase() ? 0 : 1;
        const bExact = b.path.toLowerCase() === contextName.toLowerCase() ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
      }
      return a.path.localeCompare(b.path);
    });
  }

  // Find the context: direct key, localized display name, or alias
  let contextSchema = context[contextName];
  if (!contextSchema) {
    const foundContext = Object.entries(context).find(([, sch]) =>
      sch.aliases?.includes(contextName) || (normalizeLabel(sch.display) ?? '') === contextName
    );
    if (foundContext) {
      contextSchema = foundContext[1];
    }
  }

  if (!contextSchema) {
    return [];
  }

  // Traverse the path to find the current object
  let currentObj: unknown = contextSchema.properties;

  for (let i = 0; i < partialPath.length - 1; i++) {
    const key = partialPath[i];
    if (typeof currentObj !== 'object' || currentObj === null) return [];
    const obj = currentObj as Record<string, unknown>;
    if (key in obj) {
      currentObj = obj[key];
    } else {
      // Leaf alias fallback
      const leafMatch = Object.entries(obj).find(([, v]) => isFieldAspect(v) && v.aliases?.includes(key));
      if (leafMatch) { currentObj = leafMatch[1]; continue; }
      // Branch alias fallback
      const branchMatch = Object.entries(obj).find(([, v]) =>
        typeof v === 'object' && v !== null && !isFieldAspect(v)
        && (v as { _aliases?: string[] })._aliases?.includes(key)
      );
      if (branchMatch) { currentObj = branchMatch[1]; continue; }
      // Localized display name fallback
      const localMatch = Object.entries(obj).find(([k, v]) => {
        if (k.startsWith('_')) return false;
        const localKey = isFieldAspect(v)
          ? normalizeLabel((v as FieldAspect).display)
          : normalizeLabel((v as AspectGroup)._display);
        return localKey === key;
      });
      if (localMatch) { currentObj = localMatch[1]; }
      else { return []; }
    }
  }

  if (typeof currentObj !== 'object' || currentObj === null) {
    return [];
  }

  // Get the partial key being typed
  const partialKey = partialPath.length > 0 ? partialPath[partialPath.length - 1] : '';
  const pathPrefix = partialPath.length > 1 ? partialPath.slice(0, -1).join('.') + '.' : '';

  // Build the path so far — delegate to the formatter
  const buildFullPath = (key: string): string => formatFull(contextName, pathPrefix, key);

  // Filter and build properties
  const entries = Object.entries(currentObj);

  for (const [key, value] of entries) {
    // Skip private properties
    if (key.startsWith('_')) continue;

    // Compute the localized name for this entry (what gets inserted into the formula)
    const localKey = isFieldAspect(value)
      ? (normalizeLabel((value as FieldAspect).display) ?? key)
      : (normalizeLabel((value as AspectGroup)._display) ?? key);
    const primaryIdentifier = localKey;
    // Match partial key against canonical key, localized name, or leaf aliases (case-insensitive)
    const matchesKey = key.toLowerCase().startsWith(partialKey.toLowerCase())
      || localKey.toLowerCase().startsWith(partialKey.toLowerCase())
      || primaryIdentifier.toLowerCase().startsWith(partialKey.toLowerCase());
    const matchesAlias = !matchesKey && isFieldAspect(value) && value.aliases?.some(
      alias => alias.toLowerCase().startsWith(partialKey.toLowerCase())
    );
    if (!matchesKey && !matchesAlias) continue;

    if (isFieldAspect(value)) {
      const aliasHint = value.aliases?.length ? ` (${value.aliases.join(', ')})` : '';
      options.push({
        path: primaryIdentifier,
        display: (value.display || key) + aliasHint,
        value: value.value ?? null,
        isLeaf: true,
        fullPath: buildFullPath(primaryIdentifier),
        accessPath: value.accessPath,
        isGroup: value.isGroup,
        ownerTypes: value.ownerTypes,
      });
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // It's a branch object
      const branchDisplay = (value as { _display?: string })._display ?? key;
      options.push({
        path: primaryIdentifier,
        display: branchDisplay,
        value: null,
        isLeaf: false,
        fullPath: buildFullPath(primaryIdentifier) + '.',
      });
    }
  }

  // Sort: exact matches first, then by frequency of similar property names, then alphabetically
  return options.sort((a, b) => {
    // Exact match bonus
    const aExact = a.path.toLowerCase() === partialKey.toLowerCase() ? 0 : 1;
    const bExact = b.path.toLowerCase() === partialKey.toLowerCase() ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;

    // Leaf values before branches
    const aLeaf = a.isLeaf ? 0 : 1;
    const bLeaf = b.isLeaf ? 0 : 1;
    if (aLeaf !== bLeaf) return aLeaf - bLeaf;

    return a.path.localeCompare(b.path);
  });
}

/**
 * Find a variable at a specific position in the formula
 * @param formula The formula string
 * @param position The cursor position
 * @returns The variable at that position or null
 */
export function extractVariableAtPosition(formula: string, position: number): FormulaVariable | null {
  const variables = FormulaResolver.extractVariables(formula);
  return variables.find(v => position >= v.startIndex && position <= v.endIndex) || null;
}

/**
 * Render formula tokens as HTML with error highlighting and variable tracking
 * Creates spans with data attributes for individual variable interaction
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Check whether a partial path segment matches any familiar option.
 * Used to decide if an in-progress variable should be blue (has matches) or red (no matches).
 */
function hasPartialAspectMatch(context: FamiliarSchema, contextName: string, path: string[]): boolean {
  if (!context || path.length === 0) return false;

  let contextSchema = context[contextName];
  if (!contextSchema) {
    const foundKey = Object.keys(context).find(k => context[k].aliases?.includes(contextName));
    if (foundKey) contextSchema = context[foundKey];
  }
  if (!contextSchema?.properties) return false;

  // Walk to the parent of the last segment
  let current: unknown = contextSchema.properties;
  for (let i = 0; i < path.length - 1; i++) {
    if (typeof current !== 'object' || current === null) return false;
    const obj = current as Record<string, unknown>;
    if (path[i] in obj) {
      current = obj[path[i]];
    } else {
      // Leaf alias fallback
      const leafAlias = Object.entries(obj).find(([, v]) =>
        isFieldAspect(v) && v.aliases?.includes(path[i])
      );
      if (leafAlias) { current = leafAlias[1]; continue; }
      // Branch alias fallback
      const branchAlias = Object.entries(obj).find(([, v]) =>
        typeof v === 'object' && v !== null && !isFieldAspect(v)
        && (v as { _aliases?: string[] })._aliases?.includes(path[i])
      );
      if (branchAlias) {
        current = branchAlias[1];
      } else {
        return false;
      }
    }
  }

  if (typeof current !== 'object' || current === null) return false;

  const partial = path[path.length - 1].toLowerCase();
  const obj = current as Record<string, unknown>;
  return Object.entries(obj).some(([k, v]) => {
    if (k.toLowerCase().startsWith(partial) && k.toLowerCase() !== partial) return true;
    // Also match against aliases on leaf nodes
    if (isFieldAspect(v) && v.aliases?.some(a => a.toLowerCase().startsWith(partial) && a.toLowerCase() !== partial)) return true;
    return false;
  });
}

/**
 * Determine whether a variable token is "complete" (user has finished typing it)
 * or "in-progress" (user is still typing).
 *
 * Complete when followed by a space. At end of formula we always assume
 * the user is still typing — the value is validated on commit anyway.
 */
function isVariableComplete(token: FormulaToken, formula: string): boolean {
  if (token.endIndex < formula.length) {
    return formula[token.endIndex] === ' ';
  }
  return false;
}

/**
 * Determine which `(`/`)` characters in a formula form a complete, balanced
 * pair — used to color parens blue (matched, like a resolved variable) vs
 * yellow (unmatched — still being typed, or genuinely mismatched), mirroring
 * the blue/yellow convention already used for variable tokens.
 *
 * Standard stack-based matching: nested parens resolve correctly (each `)`
 * pairs with the nearest still-open `(`); any `(` left on the stack at the
 * end, or any `)` with nothing to pop, is unmatched.
 *
 * Backslash-escaped parens (`\(`/`\)`) are skipped entirely — the escaped
 * character is consumed alongside the backslash and never reaches the `(`/`)`
 * checks below — mirroring `findMatchingParen` in
 * FormulaResolver.conditionalGrammar.mts, so a literal escaped paren inside a
 * `$conditional(...)` clause's value can't throw off the real grouping
 * parens' balance.
 */
function computeMatchedParenIndices(formula: string): Set<number> {
  const matched = new Set<number>();
  const stack: number[] = [];
  for (let i = 0; i < formula.length; i++) {
    const ch = formula[i];
    if (ch === '\\') {
      i++; // skip the escaped character entirely — not syntax-significant
      continue;
    }
    if (ch === '(') {
      stack.push(i);
    } else if (ch === ')') {
      const openIndex = stack.pop();
      if (openIndex !== undefined) {
        matched.add(openIndex);
        matched.add(i);
      }
    }
  }
  return matched;
}

/** Blue ('valid') / yellow ('partial', still typing) / red ('invalid') — shared
 * tri-state used for every highlighted operator (`!`, comparisons, `&&`/`||`). */
type OperandState = 'valid' | 'partial' | 'invalid';

/**
 * Escalate a 'partial' (still-typing) state to 'invalid' once the formula
 * field is no longer focused — while typing, an incomplete operand is just
 * "not done yet" (yellow); once the user has moved on, it's a real problem
 * (red). 'valid' and 'invalid' are unaffected — they don't depend on focus.
 */
function escalateOnBlur(state: OperandState, isFocused: boolean): OperandState {
  return !isFocused && state === 'partial' ? 'invalid' : state;
}

function stateToClass(state: OperandState): string {
  if (state === 'partial') return ' is-warning';
  if (state === 'invalid') return ' is-error';
  return '';
}

/**
 * Classify the operand immediately to the RIGHT of an operator at `index`
 * (the position right after the operator's last character), scanning
 * forward past whitespace, unary `!`/`-`/`+` prefixes, to the operand itself:
 *
 * - `'valid'` — a complete `#context.property` token, a matched `(...)`
 *   group, a `true`/`false` literal, a closed quoted string, or (when
 *   `strict` is false) a bare number/IDENT.
 * - `'partial'` — nothing left to scan (formula ends here), or an
 *   in-progress operand (unclosed quote, bare context reference with no
 *   property path yet, unmatched/still-being-typed open paren).
 * - `'invalid'` — a dangling closing delimiter with nothing meaningful
 *   before it, or (when `strict` is true, used for `!`) plain text/a raw
 *   number — syntactically fine to the evaluator, but rarely what the user
 *   means to negate.
 *
 * `strict` distinguishes `!`'s stricter "does this operand make logical
 * sense to negate" rule from comparison/`&&`/`||`'s more permissive "is
 * there a complete literal here" rule (comparisons routinely compare raw
 * numbers/strings, e.g. `Longsword != Dagger`).
 */
function classifyOperandForward(
  formula: string,
  index: number,
  tokens: FormulaToken[],
  matchedParenIndices: Set<number>,
  errors: ValidationError[],
  strict: boolean
): OperandState {
  let idx = index;
  while (idx < formula.length && /[\s!]/.test(formula[idx])) idx++;
  while (idx < formula.length && /[-+]/.test(formula[idx])) {
    idx++;
    while (idx < formula.length && /\s/.test(formula[idx])) idx++;
  }

  if (idx >= formula.length) return 'partial';

  const ch = formula[idx];

  if (ch === '#') {
    const variableToken = tokens.find(t => t.type === 'variable' && t.startIndex === idx);
    if (!variableToken) return 'partial';
    if (variableToken.partial) return 'partial';
    const matchingError = errors.find(e => e.index === variableToken.startIndex);
    if (!matchingError) return 'valid';
    return matchingError.severity === 'warning' ? 'partial' : 'invalid';
  }

  if (ch === '(') return matchedParenIndices.has(idx) ? 'valid' : 'partial';
  if (ch === ')' || ch === '&' || ch === '|') return 'invalid';

  if (ch === '\'' || ch === '"') {
    const closeIdx = formula.indexOf(ch, idx + 1);
    return closeIdx === -1 ? 'partial' : 'valid';
  }

  if (/^(?:true|false)\b/.test(formula.slice(idx))) return 'valid';

  if (strict) return 'invalid';

  // Lenient (comparisons / &&/||): a bare number or bareword IDENT counts
  // as a valid, complete operand.
  return /\S/.test(ch) ? 'valid' : 'invalid';
}

/**
 * Classify the operand immediately to the LEFT of an operator at `index`
 * (the operator's own start position), scanning backward past whitespace.
 *
 * There is no 'partial' state on the left — by the time an operator has
 * been typed, whatever precedes it is already "finished" (the user has
 * moved on); a missing/broken left operand is always `'invalid'`.
 */
function classifyOperandBackward(
  formula: string,
  index: number,
  tokens: FormulaToken[],
  matchedParenIndices: Set<number>,
  errors: ValidationError[]
): 'valid' | 'invalid' {
  let idx = index;
  while (idx > 0 && /\s/.test(formula[idx - 1])) idx--;

  if (idx === 0) return 'invalid';

  const prev = formula[idx - 1];

  if (prev === ')') return matchedParenIndices.has(idx - 1) ? 'valid' : 'invalid';
  if (prev === '(' || prev === '&' || prev === '|') return 'invalid';

  if (prev === '\'' || prev === '"') {
    const openIdx = formula.lastIndexOf(prev, idx - 2);
    return openIdx === -1 ? 'invalid' : 'valid';
  }

  const variableToken = tokens.find(t => t.type === 'variable' && t.endIndex === idx);
  if (variableToken) {
    if (variableToken.partial) return 'invalid';
    return errors.find(e => e.index === variableToken.startIndex) ? 'invalid' : 'valid';
  }

  // Bareword/number/keyword tail ending exactly here.
  return /[^\s()!<>=&|'"]/.test(prev) ? 'valid' : 'invalid';
}

/**
 * Classify a `!` (logical NOT) operator at `bangIndex` by what it negates.
 * Thin wrapper over `classifyOperandForward` in strict mode (chained `!!...`
 * is read through correctly since the forward-scan already skips leading
 * `!`/whitespace).
 */
function classifyBangOperator(
  formula: string,
  bangIndex: number,
  tokens: FormulaToken[],
  matchedParenIndices: Set<number>,
  errors: ValidationError[]
): OperandState {
  return classifyOperandForward(formula, bangIndex + 1, tokens, matchedParenIndices, errors, true);
}

/**
 * Classify a binary operator (comparison `>`/`<`/`>=`/`<=`/`==`/`!=`, or
 * logical `&&`/`||`) at `[opIndex, opIndex + opLength)` by combining its
 * left and right operand states: red wins if either side is definitively
 * broken, otherwise yellow wins if the right side is still being typed,
 * otherwise blue.
 */
function classifyBinaryOperator(
  formula: string,
  opIndex: number,
  opLength: number,
  tokens: FormulaToken[],
  matchedParenIndices: Set<number>,
  errors: ValidationError[]
): OperandState {
  const left = classifyOperandBackward(formula, opIndex, tokens, matchedParenIndices, errors);
  const right = classifyOperandForward(formula, opIndex + opLength, tokens, matchedParenIndices, errors, false);
  if (left === 'invalid' || right === 'invalid') return 'invalid';
  if (right === 'partial') return 'partial';
  return 'valid';
}

/**
 * Classify a malformed `$conditional(...)` block by its `ConditionalBlockError`:
 *
 * - `'partial'` (yellow, still typing) — `unbalancedParens`/`missingElse`
 *   are exactly the states you'd expect mid-edit (haven't closed the outer
 *   paren yet / haven't gotten to `else()` yet).
 * - `'invalid'` (red, always) — `multipleElse`/`whenArgCount`/`elseArgCount`
 *   are genuinely malformed regardless of focus (a closed clause with the
 *   wrong shape isn't "still typing", it's just wrong).
 */
function conditionalErrorState(error: ConditionalBlockError): OperandState {
  return error === 'unbalancedParens' || error === 'missingElse' ? 'partial' : 'invalid';
}

/**
 * Classify a malformed `$contains(...)`/`$find(...)`/`$any(...)`/`$count(...)`/
 * `$stringContains(...)` block by its `FunctionBlockError`, mirroring
 * `conditionalErrorState`'s partial-vs-invalid split — `unbalancedParens` (not
 * closed yet) and `missingProjection` (closed the call but hasn't typed
 * `$find(...)`'s trailing `.projection` yet) are both "still typing" states;
 * `argCount` (a closed, balanced call with the wrong number of arguments) is
 * genuinely malformed regardless of focus.
 */
function functionErrorState(error: FunctionBlockError): OperandState {
  return error === 'unbalancedParens' || error === 'missingProjection' ? 'partial' : 'invalid';
}

export function renderFormulaHTML(
  formula: string,
  tokens: FormulaToken[],
  errors: ValidationError[],
  familiarSchema?: FamiliarSchema,
  isFocused = true
): string {
  let variableIndex = 0;
  const matchedParenIndices = computeMatchedParenIndices(formula);
  const conditionalBlocks = FormulaResolver.findConditionalBlocks(formula);
  const functionBlocks = FormulaResolver.findFunctionBlocks(formula);
  // Longest-alternative-first so `>=`/`<=`/`==`/`!=`/`&&`/`||` win over their
  // single-char prefixes (e.g. `!=` over bare `!`). `$conditional`/`when`/`else`
  // only match when followed by optional whitespace + `(` (the lookahead leaves
  // the `(` itself for its own delimiter branch) so stray prose-like text
  // elsewhere in a formula isn't mistaken for the `$conditional(...)` clause
  // keywords. `$and`/`$or` are keyword aliases for `&&`/`||` (word-bounded so
  // they don't clip a longer bareword like `$android`). Backslash-escaped
  // parens/`$conditional`/`$and`/`$or` (`\(`, `\)`, `\$conditional(`, `\$and`,
  // `\$or`) are excluded via `(?<!\\)` so they fall through as plain text
  // instead of structural syntax — mirrors the same single-backslash escape
  // convention `FormulaResolver.conditionalGrammar.mts` uses for
  // `$conditional(`'s own open-regex (comparison operators and `when`/`else`
  // have no escape mechanism in the real grammar, so they're intentionally
  // left un-escapable here too).
  //
  // `$contains`/`$find`/`$any`/`$count`/`$stringContains` (poc §7.2b) get the same
  // complete-keyword-plus-open-paren treatment as `$conditional`. The final
  // catch-all `\$[A-Za-z]*` (bare `$`, or any partial/unrecognized `$word`
  // with no `(` yet) is listed LAST so every more specific alternative gets
  // first shot at a given position — it exists purely so an in-progress `$`
  // command renders as a yellow "still typing" token (mirroring a bare/partial
  // `#context` token) instead of falling through as unstyled plain text.
  const OPERATOR_SPLIT =
    /((?<!\\)\(|(?<!\\)\)|>=|<=|==|!=|&&|\|\||[!<>]|(?<!\\)\$conditional(?=\s*\()|(?<!\\)\$(?:contains|find|any|count|stringContains)(?=\s*\()|\bwhen(?=\s*\()|\belse(?=\s*\()|(?<!\\)\$and\b|(?<!\\)\$or\b|(?<!\\)\$[A-Za-z]*)/i;

  return tokens
    .map(token => {
      if (token.type === 'text') {
        // Wrap each operator/paren/keyword individually so it can be colored
        // by its own state; everything else in the text run passes through
        // unhighlighted.
        const pieces = token.value.split(OPERATOR_SPLIT);
        let out = '';
        let cursor = token.startIndex;
        for (const piece of pieces) {
          if (piece === '(' || piece === ')') {
            const state = escalateOnBlur(matchedParenIndices.has(cursor) ? 'valid' : 'partial', isFocused);
            const parenError = errors.find(e => e.index === cursor);
            const titleAttr = parenError?.error ? ` title="${escapeHTML(parenError.error)}"` : '';
            out += `<span class="formula-paren${stateToClass(state)}"${titleAttr} data-start="${cursor}" data-end="${cursor + piece.length}">${piece}</span>`;
          } else if (piece === '!') {
            const state = escalateOnBlur(classifyBangOperator(formula, cursor, tokens, matchedParenIndices, errors), isFocused);
            out += `<span class="formula-operator${stateToClass(state)}" data-start="${cursor}" data-end="${cursor + piece.length}">!</span>`;
          } else if (/^\$conditional$/i.test(piece)) {
            // Because the catch-all `\$[A-Za-z]*` alternative can ALSO capture
            // a bare "$conditional" with no "(" yet (still typing the keyword
            // itself), a missing `conditionalBlocks` entry doesn't mean "valid"
            // — `findConditionalBlocks` only records a block once the "(" is
            // present. No entry here means the keyword isn't closed yet.
            const block = conditionalBlocks.find(b => b.startIndex === cursor);
            const state = escalateOnBlur(!block ? 'partial' : block.error ? conditionalErrorState(block.error) : 'valid', isFocused);
            const keywordError = errors.find(e => e.index === cursor);
            const titleAttr = keywordError?.error ? ` title="${escapeHTML(keywordError.error)}"` : '';
            out += `<span class="formula-keyword${stateToClass(state)}"${titleAttr} data-start="${cursor}" data-end="${cursor + piece.length}">${escapeHTML(piece)}</span>`;
          } else if (/^\$(?:contains|find|any|count|stringcontains)$/i.test(piece)) {
            // Same reasoning as the `$conditional` branch above — no matching
            // `functionBlocks` entry means the "(" hasn't been typed yet.
            const block = functionBlocks.find(b => b.startIndex === cursor);
            const state = escalateOnBlur(!block ? 'partial' : block.error ? functionErrorState(block.error) : 'valid', isFocused);
            const keywordError = errors.find(e => e.index === cursor);
            const titleAttr = keywordError?.error ? ` title="${escapeHTML(keywordError.error)}"` : '';
            out += `<span class="formula-keyword${stateToClass(state)}"${titleAttr} data-start="${cursor}" data-end="${cursor + piece.length}">${escapeHTML(piece)}</span>`;
          } else if (/^\$[A-Za-z]*$/.test(piece)) {
            // Bare `$`, or a partial/unrecognized `$word` with no `(` yet — an
            // in-progress `$` command. Same yellow-while-focused,
            // red-once-blurred treatment as a still-typing `#` token/custom
            // path (see the `token.partial` branch below).
            const state = escalateOnBlur('partial', isFocused);
            out += `<span class="formula-keyword${stateToClass(state)}" data-start="${cursor}" data-end="${cursor + piece.length}">${escapeHTML(piece)}</span>`;
          } else if (/^(?:when|else)$/i.test(piece)) {
            out += `<span class="formula-keyword" data-start="${cursor}" data-end="${cursor + piece.length}">${escapeHTML(piece)}</span>`;
          } else if (/^\$(?:and|or)$/i.test(piece)) {
            const state = escalateOnBlur(
              classifyBinaryOperator(formula, cursor, piece.length, tokens, matchedParenIndices, errors),
              isFocused
            );
            out += `<span class="formula-operator${stateToClass(state)}" data-start="${cursor}" data-end="${cursor + piece.length}">${escapeHTML(piece)}</span>`;
          } else if (['>=', '<=', '==', '!=', '&&', '||', '<', '>'].includes(piece)) {
            const state = escalateOnBlur(
              classifyBinaryOperator(formula, cursor, piece.length, tokens, matchedParenIndices, errors),
              isFocused
            );
            out += `<span class="formula-operator${stateToClass(state)}" data-start="${cursor}" data-end="${cursor + piece.length}">${escapeHTML(piece)}</span>`;
          } else {
            out += escapeHTML(piece);
          }
          cursor += piece.length;
        }
        return out;
      }

      const varIdx = variableIndex++;
      const complete = isVariableComplete(token, formula);
      const matchingError = errors.find(e => e.index === token.startIndex);

      // ── PARTIAL TOKEN (unclosed quote) ──
      if (token.partial) {
        if (complete) {
          // Unclosed quote terminated by space → all red
          return `<span class="formula-variable is-error" title="${escapeHTML(game.i18n.localize('dnd35e.Formula.Errors.invalidVariable'))}" data-var-index="${varIdx}" data-start="${token.startIndex}" data-end="${token.endIndex}">${escapeHTML(token.value)}</span>`;
        }
        // Still typing custom path → yellow while focused, red once blurred
        const stillTypingClass = stateToClass(escalateOnBlur('partial', isFocused));
        return `<span class="formula-variable${stillTypingClass}" data-var-index="${varIdx}" data-start="${token.startIndex}" data-end="${token.endIndex}">${escapeHTML(token.value)}</span>`;
      }

      // ── CUSTOM PATH (closed quote, e.g. #self.'system.isIdentified') → always yellow with tooltip ──
      if (matchingError?.severity === 'warning' && token.value.includes('\'')) {
        const tooltip = ` title="${escapeHTML(game.i18n.format('dnd35e.Formula.Errors.unknownPathWarning', { path: matchingError.error }))}"`;
        return `<span class="formula-variable is-warning"${tooltip} data-var-index="${varIdx}" data-start="${token.startIndex}" data-end="${token.endIndex}">${escapeHTML(token.value)}</span>`;
      }

      // ── STANDARD VARIABLE ──

      // No validation error → exact match → blue + tooltip (both complete and in-progress)
      if (!matchingError) {
        let tooltip = '';
        if (familiarSchema) {
          const parts = token.value.substring(1).split('.');
          const contextName = parts[0];
          const path = parts.slice(1);
          if (path.length > 0) {
            const value = FormulaResolver.getPropertyValue(familiarSchema, contextName, path);
            if (value !== null && value !== undefined) {
              tooltip = escapeHTML(String(value));
            } else {
              const prop = FormulaResolver.getFieldAspect(familiarSchema, contextName, path);
              if (prop) tooltip = escapeHTML(prop.accessPath);
            }
          } else {
            const schema = familiarSchema[contextName];
            tooltip = schema ? game.i18n.format('dnd35e.Formula.Errors.contextTooltip', { context: escapeHTML(contextName) }) : '';
          }
        }
        const titleAttr = tooltip ? ` title="${tooltip}"` : '';
        return `<span class="formula-variable"${titleAttr} data-var-index="${varIdx}" data-start="${token.startIndex}" data-end="${token.endIndex}">${escapeHTML(token.value)}</span>`;
      }

      // ── HAS VALIDATION ERROR ──

      if (complete) {
        // Complete + error → all red with "Invalid variable" tooltip
        return `<span class="formula-variable is-error" title="${escapeHTML(game.i18n.localize('dnd35e.Formula.Errors.invalidVariable'))}" data-var-index="${varIdx}" data-start="${token.startIndex}" data-end="${token.endIndex}">${escapeHTML(token.value)}</span>`;
      }

      // In-progress + error: check if last segment partially matches familiar
      if (familiarSchema && matchingError.severity === 'error') {
        const body = token.value.substring(1);
        const { context: ctxName, path } = FormulaResolver.parseVariableSegments(body);

        if (path.length > 0 && hasPartialAspectMatch(familiarSchema, ctxName, path)) {
          // Partial match → all blue, no tooltip (still typing)
          return `<span class="formula-variable" data-var-index="${varIdx}" data-start="${token.startIndex}" data-end="${token.endIndex}">${escapeHTML(token.value)}</span>`;
        }

        if (path.length > 0) {
          // No partial match → split: blue prefix + red suffix (no tooltip)
          const dotIdx = token.value.lastIndexOf('.');
          if (dotIdx > 0) {
            const prefix = token.value.substring(0, dotIdx + 1);
            const suffix = token.value.substring(dotIdx + 1);
            return `<span class="formula-variable" data-var-index="${varIdx}" data-start="${token.startIndex}" data-end="${token.endIndex}">${escapeHTML(prefix)}<span class="is-error">${escapeHTML(suffix)}</span></span>`;
          }
        }
      }

      // Fallback: show as warning (bare context, incomplete, etc.) while
      // focused, escalating to an error once the field loses focus.
      const fallbackState = escalateOnBlur(matchingError.severity === 'warning' ? 'partial' : 'invalid', isFocused);
      return `<span class="formula-variable${stateToClass(fallbackState)}" data-var-index="${varIdx}" data-start="${token.startIndex}" data-end="${token.endIndex}">${escapeHTML(token.value)}</span>`;
    })
    .join('');
}

export function renderFormulaDisplayHTML(
  formula: string,
  familiarSchema?: FamiliarSchema
): string {
  const tokens = FormulaResolver.parseFormula(formula);

  return tokens
    .map(token => {
      if (token.type === 'text') {
        return escapeHTML(token.value);
      }

      if (token.partial) {
        return `<span class="formula-variable is-warning">${escapeHTML(token.value)}</span>`;
      }

      const body = token.value.substring(1);
      const { context, path } = FormulaResolver.parseVariableSegments(body);
      if (!familiarSchema || path.length === 0) {
        return `<span class="formula-variable">${escapeHTML(token.value)}</span>`;
      }

      const value = FormulaResolver.getPropertyValue(familiarSchema, context, path);
      const displayValue = value !== null && value !== undefined ? String(value) : token.value;
      return `<span class="formula-variable">${escapeHTML(displayValue)}</span>`;
    })
    .join('');
}

/**
 * Find a token at a specific position in the formula
 */
export function getTokenAtPosition(tokens: FormulaToken[], position: number): FormulaToken | null {
  return tokens.find(t => position >= t.startIndex && position <= t.endIndex) ?? null;
}

/**
 * Get the position of a variable token within the tokens array
 */
export function getVariableTokenIndex(tokens: FormulaToken[], position: number): number {
  let varIndex = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'variable') {
      if (position >= tokens[i].startIndex && position <= tokens[i].endIndex) {
        return varIndex;
      }
      varIndex++;
    }
  }
  return -1;
}

/**
 * Get all variable tokens from a formula
 */
export function getVariableTokens(tokens: FormulaToken[]): FormulaToken[] {
  return tokens.filter(t => t.type === 'variable');
}

/**
 * Insert text at cursor position helper
 */
export function insertAtCursor(before: string, insertion: string, after: string): string {
  return before + insertion + after;
}

/**
 * Get coordinates for positioning tooltip/autocomplete (relative to container)
 */
export function getCaretCoordinates(element: HTMLElement, offset: number): { top: number; left: number } {
  const div = document.createElement('div');
  const span = document.createElement('span');

  // Copy relevant styles
  const style = window.getComputedStyle(element);
  ['direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY', 'textAlign',
    'font', 'lineHeight', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
    'border', 'letterSpacing', 'wordSpacing'].forEach((prop) => {
    div.style[prop as any] = style[prop as any];
  });

  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.overflow = 'hidden';

  const text = element.textContent || '';
  span.textContent = text.substring(0, offset) || '.';

  div.appendChild(span);
  document.body.appendChild(div);

  const rect = span.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();

  document.body.removeChild(div);

  return {
    top: rect.top - divRect.top,
    left: rect.left - divRect.left,
  };
}

// ── Name-formula helpers ────────────────────────────────────────────

/**
 * Hydrate a FamiliarContext with live values from document data.
 *
 * Walks every FieldAspect in the schema tree and fills in its
 * `value` field by reading the `accessPath` from the matching document
 * data object.  Mutates the context in place and returns it for chaining.
 *
 * @param context  The schema-only context (from buildContextFromFormula)
 * @param dataMap  Maps context names (e.g. "self", "owner") to plain objects
 */
/** Build a FormulaDataSource from a plain name string (no variable references, just literal text). */
export const nameToFormulaData = (name: string): FormulaDataSource => FormulaData.toSource(name);

/** Ensures that systemData has a nameFormula value, using the documentName as a fallback. */
export const ensureNameFormula = (systemData: Record<string, any>, documentName: string): void => {
  const nf = systemData.nameFormula?.value;
  if (nf && !nf.formula) {
    nf.formula = documentName;
  }
};

/**
 * Evaluate a formula field by resolving #context.path variables.
 *
 * Uses the stored contexts map to look up the correct familiar schema
 * for each context, then resolves variables via their accessPaths against
 * the live document data.
 *
 * @param formulaData The stored formula field (formula + contexts)
 * @param documentDataMap Maps context names to their document plain objects
 * @param fallbackName Fallback name if formula is empty
 */
export const resolveFormulaField = (
  formulaData: FormulaFieldData | null | undefined,
  documentDataMap: Record<string, DocumentContext>,
  fallbackName: string
): string => {
  if (!formulaData?.formula) return fallbackName;

  const familiarSchema = buildContextFromFormula(formulaData);
  return FormulaResolver.resolveFormula(formulaData.formula, familiarSchema, documentDataMap);
};

/**
 * Convert a live document or POJO to a plain data object suitable for
 * formula resolution, preserving `documentName` and `type` for schema lookups.
 */
export function toFormulaDataObject(doc: any): any {
  const data = doc.toObject ? doc.toObject() : doc;
  // `doc.toObject()` returns *source* data, which omits derived (persisted: false)
  // schema fields such as `system.isBroken`. Formula resolution must be able to
  // reference derived values, so overlay the live prepared system data — its
  // `toObject(false)` includes derived fields with their current computed values.
  if (doc?.system?.toObject && data && typeof data === 'object') {
    data.system = doc.system.toObject(false);
  }
  if (doc.documentName) data.documentName = doc.documentName;
  if (doc.type) data.type = doc.type;
  return data;
}

/**
 * Build a documentDataMap for formula resolution.
 *
 * Callers explicitly declare which contexts they want. Each entry is
 * converted to a POJO with `documentName` / `type` preserved for schema lookups.
 *
 * @param self The document (or POJO) for the `self` context
 * @param additionalContexts Named context entries — e.g. `{ Owner: actorDoc, Item: itemDoc }`.
 *   Values can be live documents or POJOs; live documents are converted via `.toObject()`.
 *   Null/undefined values are silently skipped.
 * @returns Record mapping context names to their plain-object data
 *
 * @example
 * // Weapon on an actor
 * buildDocumentDataMap(weaponDoc, { Owner: weaponDoc.parent })
 *
 * // Material effect on an item
 * buildDocumentDataMap(materialEffect, { Item: materialEffect.parent })
 *
 * // Future: with a target
 * buildDocumentDataMap(weaponDoc, { Owner: weaponDoc.parent, target: targetActor })
 */
export function buildDocumentDataMap(
  self: any,
  additionalContexts?: Record<string, any>
): Record<string, DocumentContext> {
  const map: Record<string, DocumentContext> = { self: toFormulaDataObject(self) };
  if (additionalContexts) {
    for (const [name, doc] of Object.entries(additionalContexts)) {
      if (doc) map[name] = toFormulaDataObject(doc);
    }
  }
  return map;
}
