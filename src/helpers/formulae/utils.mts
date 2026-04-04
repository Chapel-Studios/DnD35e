/**
 * FormulaFormGroup Utility Functions
 * Core parsing, validation, and resolution logic
 */
import type { FormulaDataSource } from './FormulaData.mjs';
import { FormulaData } from './FormulaData.mjs';
import { buildContextFromFormula, DocumentContext } from './registry.mjs';
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

// ============================================================================
// Schema Filtering
// ============================================================================

/**
 * Return a copy of `schema` with the given top-level aspect keys removed from
 * every context's properties.  Used to prevent circular references (e.g.
 * nameFormula must not reference `name`).
 *
 * Only strips keys at the root of each context's `properties` — nested paths
 * are not affected.
 */
export function filterExcludedFields(
  schema: FamiliarSchema,
  excludedFields: string[]
): FamiliarSchema {
  if (!excludedFields.length) return schema;

  const filtered: FamiliarSchema = {};
  for (const [ctxName, ctx] of Object.entries(schema)) {
    const props = { ...ctx.properties };
    for (const key of excludedFields) {
      delete props[key];
    }
    filtered[ctxName] = { ...ctx, properties: props };
  }
  return filtered;
}

/**
 * Regex matching formula variables:
 *   #context.property.nested       — standard familiar path
 *   #context.'raw.dotted.path'     — custom / arbitrary document path (closed quote)
 *   #context.'partial.text         — unclosed quote, no spaces (still typing)
 *
 * The optional quoted segment (single-quotes) lets users reference any
 * document path that isn't exposed through the familiar shortcuts.
 *
 * Uses a negative lookbehind so `\#` is treated as a literal `#`, not a variable.
 */
const VARIABLE_REGEX = /(?<!\\)#\w+(?:\.(?:'[^']*'|'[^ ']*|\w+))*/g;

/**
 * Parse a formula into tokens (text and variables)
 * Handles #contextName.property.nested.path, #context.'raw.path' and partial syntax
 */
export function parseFormula(formula: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  const regex = new RegExp(VARIABLE_REGEX.source, 'g');
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(formula)) !== null) {
    // Add text token before the variable
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        value: formula.substring(lastIndex, match.index),
        startIndex: lastIndex,
        endIndex: match.index,
      });
    }

    const raw = match[0];
    // Detect unclosed quote — the match grabbed to EOL without a closing '
    const quoteCount = (raw.match(/'/g) || []).length;
    const isPartial = quoteCount % 2 !== 0;

    tokens.push({
      type: 'variable',
      value: raw,
      startIndex: match.index,
      endIndex: match.index + raw.length,
      ...(isPartial && { partial: true }),
    });

    lastIndex = match.index + raw.length;
  }

  // Add remaining text
  if (lastIndex < formula.length) {
    tokens.push({
      type: 'text',
      value: formula.substring(lastIndex),
      startIndex: lastIndex,
      endIndex: formula.length,
    });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', value: formula, startIndex: 0, endIndex: formula.length }];
}

/**
 * Split a variable body (after the leading #) into segments,
 * respecting single-quoted segments which represent raw paths.
 * Returns { context, path, customAccessPath? }.
 *
 *   "self.hardness"               → { context: "self", path: ["hardness"] }
 *   "self.'system.isIdentified'"  → { context: "self", path: [], customAccessPath: "system.isIdentified" }
 */
function parseVariableSegments(body: string): { context: string; path: string[]; customAccessPath?: string } {
  const segments: string[] = [];
  let current = '';
  let inQuote = false;
  let customAccessPath: string | undefined;

  for (const ch of body) {
    if (ch === '\'' && !inQuote) {
      inQuote = true;
    } else if (ch === '\'' && inQuote) {
      // The content inside quotes is the raw access path
      customAccessPath = current;
      current = '';
      inQuote = false;
    } else if (ch === '.' && !inQuote) {
      if (current) segments.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) {
    if (inQuote) {
      // Unclosed quote — treat accumulated text as a partial custom path
      customAccessPath = current;
    } else {
      segments.push(current);
    }
  }

  const context = segments[0] ?? '';
  const path = customAccessPath !== undefined ? [] : segments.slice(1);
  return { context, path, customAccessPath };
}

/**
 * Extract all variables from a formula
 * @param formula The formula string
 * @returns Array of found variables
 */
export function extractVariables(formula: string): FormulaVariable[] {
  const regex = new RegExp(VARIABLE_REGEX.source, 'g');
  const variables: FormulaVariable[] = [];
  let match;

  while ((match = regex.exec(formula)) !== null) {
    const variable = match[0];
    const body = variable.substring(1); // Remove leading #
    const { context, path, customAccessPath } = parseVariableSegments(body);

    variables.push({
      variable,
      context,
      path,
      startIndex: match.index,
      endIndex: match.index + variable.length,
      isValid: true,
      ...(customAccessPath !== undefined && { customAccessPath }),
    });
  }

  return variables;
}

/**
 * Resolve all variables in a formula against document data using familiar accessPaths.
 *
 * For each #context.path variable, looks up the FieldAspect in the schema
 * to find its accessPath, then reads that path from the document data.
 *
 * @param formula The formula string with #context.path variables
 * @param familiarSchema The familiar schema (defines accessPaths)
 * @param documentDataMap Maps context names to their document data objects
 * @returns Formula with variables replaced by their resolved values
 */
export function resolveFormula(
  formula: string,
  familiarSchema: FamiliarSchema,
  documentDataMap: Record<string, DocumentContext>
): string {
  let result = formula;
  const variables = extractVariables(formula);

  // Process in reverse order to maintain string indices
  for (let i = variables.length - 1; i >= 0; i--) {
    const variable = variables[i];
    const docData = documentDataMap[variable.context];
    if (!docData) continue;

    // Custom quoted path — use the raw path directly as the accessPath
    if (variable.customAccessPath) {
      const value = getNestedValue(docData, variable.customAccessPath);
      if (value !== undefined && value !== null) {
        result =
          result.substring(0, variable.startIndex) +
          String(value) +
          result.substring(variable.endIndex);
      }
      continue;
    }

    // Find the FieldAspect to get the accessPath
    const prop = getFieldAspect(familiarSchema, variable.context, variable.path);
    if (!prop) continue;

    const value = getNestedValue(docData, prop.accessPath);

    if (value !== undefined && value !== null) {
      result =
        result.substring(0, variable.startIndex) +
        String(value) +
        result.substring(variable.endIndex);
    }
  }

  // Unescape literal \# → #
  result = result.replace(/\\#/g, '#');

  return result;
}

/**
 * Walk a dotted path on any object to retrieve a nested value.
 * Works with live Foundry documents (getter access) and plain objects alike.
 */
export function getNestedValue(obj: object, dottedPath: string): unknown {
  let current: unknown = obj;
  for (const key of dottedPath.split('.')) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Factory for FieldAspect that optionally resolves the value
 * from a context object (live document or plain object) using the accessPath.
 *
 * When `context` is provided, the value at `accessPath` is read (including
 * any custom getters) and coerced to the property's type. Without context,
 * only the schema shape is returned (value remains undefined).
 */
export function fieldAspect<TContext extends DocumentContext>(
  display: string,
  type: 'string' | 'number',
  accessPath: string,
  context?: TContext
): FieldAspect {
  const prop: FieldAspect = { display, type, accessPath };
  if (context) {
    const raw = getNestedValue(context, accessPath);
    if (raw !== undefined && raw !== null) {
      prop.value = type === 'number' ? Number(raw) : String(raw);
    }
  }
  return prop;
}

/**
 * Walk the familiar tree to find the FieldAspect at a given path.
 */
function getFieldAspect(context: FamiliarSchema, contextName: string, path: string[]): FieldAspect | null {
  let contextSchema = context[contextName];

  if (!contextSchema) {
    const foundKey = Object.keys(context).find(k => context[k].aliases?.includes(contextName));
    if (foundKey) contextSchema = context[foundKey];
  }

  if (!contextSchema?.properties) return null;

  let current: unknown = contextSchema.properties;
  for (const key of path) {
    if (typeof current !== 'object' || current === null || !(key in current)) return null;
    current = (current as Record<string, unknown>)[key];
  }

  return isFieldAspect(current) ? current : null;
}

/**
 * Get the value of a property from the familiar context.
 * Uses accessPath to read the value from the document data if available.
 * Falls back to the static value on the FieldAspect.
 */
export function getPropertyValue(context: FamiliarSchema, contextName: string, path: string[]): string | number | null {
  const prop = getFieldAspect(context, contextName, path);
  if (!prop) return null;
  return prop.value ?? null;
}

/**
 * Validate all variables in a formula
 * @param formula The formula string
 * @param context The familiar context
 * @returns Array of validation errors (empty if valid)
 */
export function validateFormula(formula: string, context: FamiliarSchema): ValidationError[] {
  if (!context) return [];
  const errors: ValidationError[] = [];
  const variables = extractVariables(formula);

  for (const variable of variables) {
    const error = validateVariable(variable, context);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

/**
 * Validate a single variable
 * @param variable The FormulaVariable to validate
 * @param context The familiar context
 * @returns ValidationError or null if valid
 */
function validateVariable(variable: FormulaVariable, context: FamiliarSchema): ValidationError | null {
  // Custom quoted path — trusted, skip all validation, just flag as warning
  if (variable.customAccessPath !== undefined) {
    variable.isValid = true;
    return {
      variable: variable.variable,
      context: variable.context,
      path: variable.path,
      error: variable.customAccessPath,
      severity: 'warning',
      index: variable.startIndex,
    };
  }

  let contextSchema = context[variable.context];

  if (!contextSchema) {
    // Try to find by alias
    const foundKey = Object.keys(context).find(k => context[k].aliases?.includes(variable.context));
    if (foundKey) {
      contextSchema = context[foundKey];
    }
  }

  if (!contextSchema || typeof contextSchema !== 'object' || !('properties' in contextSchema)) {
    return {
      variable: variable.variable,
      context: variable.context,
      path: variable.path,
      error: `Context '${variable.context}' not found`,
      severity: 'error',
      index: variable.startIndex,
    };
  }

  // Bare context reference without a property path (e.g. #owner) is incomplete
  if (variable.path.length === 0) {
    return {
      variable: variable.variable,
      context: variable.context,
      path: variable.path,
      error: `Incomplete reference — specify a property (e.g. #${variable.context}.name)`,
      severity: 'warning',
      index: variable.startIndex,
    };
  }

  let current: unknown = (contextSchema as { properties: AspectGroup }).properties;
  let pathTraversed: string[] = [];

  for (const key of variable.path) {
    if (typeof current !== 'object' || current === null || !(key in current)) {
      return {
        variable: variable.variable,
        context: variable.context,
        path: variable.path,
        error: `Property '${key}' not found on ${variable.context}${pathTraversed.length > 0 ? '.' + pathTraversed.join('.') : ''}`,
        severity: 'error',
        index: variable.startIndex,
      };
    }

    current = (current as Record<string, unknown>)[key];
    pathTraversed.push(key);
  }

  // The path must resolve to a leaf property, not an intermediate object
  if (!isFieldAspect(current)) {
    return {
      variable: variable.variable,
      context: variable.context,
      path: variable.path,
      error: `'${variable.variable}' is an object, not a property — specify a deeper path`,
      severity: 'warning',
      index: variable.startIndex,
    };
  }

  variable.isValid = true;
  return null;
}

/**
 * Get autocomplete options for the current context and path
 * Provides intelligent filtering and sorting
 */
export function getAutocompleteOptions(currentText: string, context: FamiliarSchema): AutocompleteOption[] {
  if (!context) return [];
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
      // Check if partial input matches the primary name or any alias
      const matchesPrimary = !contextName || name.toLowerCase().startsWith(contextName.toLowerCase());
      const matchesAlias = !matchesPrimary && schema.aliases?.some(
        alias => alias.toLowerCase().startsWith(contextName.toLowerCase())
      );

      if (matchesPrimary || matchesAlias) {
        if (!seenOptions.has(name)) {
          const aliasHint = schema.aliases?.length ? ` (${schema.aliases.join(', ')})` : '';
          options.push({
            path: name,
            display: `${name}${aliasHint}`,
            value: null,
            isLeaf: false,
            fullPath: `#${name}.`,
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

  // Find the context (or its alias)
  let contextSchema = context[contextName];
  if (!contextSchema) {
    const foundContext = Object.entries(context).find(([, schema]) => schema.aliases?.includes(contextName));
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
    if (typeof currentObj !== 'object' || currentObj === null || !(key in currentObj)) {
      return [];
    }
    currentObj = (currentObj as Record<string, unknown>)[key];
  }

  if (typeof currentObj !== 'object' || currentObj === null) {
    return [];
  }

  // Get the partial key being typed
  const partialKey = partialPath.length > 0 ? partialPath[partialPath.length - 1] : '';
  const pathPrefix = partialPath.length > 1 ? partialPath.slice(0, -1).join('.') + '.' : '';

  // Build the path so far
  const baseFullPath = `#${contextName}.${pathPrefix}`;

  // Filter and build properties
  const entries = Object.entries(currentObj);

  for (const [key, value] of entries) {
    // Skip private properties
    if (key.startsWith('_')) continue;

    // Match partial key (case-insensitive)
    if (!key.toLowerCase().startsWith(partialKey.toLowerCase())) continue;

    if (isFieldAspect(value)) {
      options.push({
        path: key,
        display: value.display || key,
        value: value.value ?? null,
        isLeaf: true,
        fullPath: baseFullPath + key,
        accessPath: value.accessPath,
      });
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // It's a branch object
      options.push({
        path: key,
        display: key,
        value: null,
        isLeaf: false,
        fullPath: baseFullPath + key + '.',
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
  const variables = extractVariables(formula);
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
    if (typeof current !== 'object' || current === null || !(path[i] in current)) return false;
    current = (current as Record<string, unknown>)[path[i]];
  }

  if (typeof current !== 'object' || current === null) return false;

  const partial = path[path.length - 1].toLowerCase();
  return Object.keys(current).some(k => k.toLowerCase().startsWith(partial) && k.toLowerCase() !== partial);
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

export function renderFormulaHTML(
  formula: string,
  tokens: FormulaToken[],
  errors: ValidationError[],
  familiarSchema?: FamiliarSchema
): string {
  let variableIndex = 0;

  return tokens
    .map(token => {
      if (token.type === 'text') {
        return escapeHTML(token.value);
      }

      const varIdx = variableIndex++;
      const complete = isVariableComplete(token, formula);
      const matchingError = errors.find(e => e.index === token.startIndex);

      // ── PARTIAL TOKEN (unclosed quote) ──
      if (token.partial) {
        if (complete) {
          // Unclosed quote terminated by space → all red
          return `<span class="formula-variable is-error" title="Invalid variable" data-var-index="${varIdx}" data-start="${token.startIndex}" data-end="${token.endIndex}">${escapeHTML(token.value)}</span>`;
        }
        // Still typing custom path → ALL yellow
        return `<span class="formula-variable is-warning" data-var-index="${varIdx}" data-start="${token.startIndex}" data-end="${token.endIndex}">${escapeHTML(token.value)}</span>`;
      }

      // ── CUSTOM PATH (closed quote, e.g. #self.'system.isIdentified') → always yellow with tooltip ──
      if (matchingError?.severity === 'warning' && token.value.includes('\'')) {
        const tooltip = ` title="Warning unknown path: ${escapeHTML(matchingError.error)}"`;
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
            const value = getPropertyValue(familiarSchema, contextName, path);
            if (value !== null && value !== undefined) {
              tooltip = escapeHTML(String(value));
            } else {
              const prop = getFieldAspect(familiarSchema, contextName, path);
              if (prop) tooltip = escapeHTML(prop.accessPath);
            }
          } else {
            const schema = familiarSchema[contextName];
            tooltip = schema ? `Context: ${escapeHTML(contextName)}` : '';
          }
        }
        const titleAttr = tooltip ? ` title="${tooltip}"` : '';
        return `<span class="formula-variable"${titleAttr} data-var-index="${varIdx}" data-start="${token.startIndex}" data-end="${token.endIndex}">${escapeHTML(token.value)}</span>`;
      }

      // ── HAS VALIDATION ERROR ──

      if (complete) {
        // Complete + error → all red with "Invalid variable" tooltip
        return `<span class="formula-variable is-error" title="Invalid variable" data-var-index="${varIdx}" data-start="${token.startIndex}" data-end="${token.endIndex}">${escapeHTML(token.value)}</span>`;
      }

      // In-progress + error: check if last segment partially matches familiar
      if (familiarSchema && matchingError.severity === 'error') {
        const body = token.value.substring(1);
        const { context: ctxName, path } = parseVariableSegments(body);

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

      // Fallback: show as warning (bare context, incomplete, etc.)
      const isWarning = matchingError.severity === 'warning';
      const stateClass = isWarning ? ' is-warning' : ' is-error';
      return `<span class="formula-variable${stateClass}" data-var-index="${varIdx}" data-start="${token.startIndex}" data-end="${token.endIndex}">${escapeHTML(token.value)}</span>`;
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
  return resolveFormula(formulaData.formula, familiarSchema, documentDataMap);
};

/**
 * Convert a live document or POJO to a plain data object suitable for
 * formula resolution, preserving `documentName` and `type` for schema lookups.
 */
export function toFormulaDataObject(doc: any): any {
  const data = doc.toObject ? doc.toObject() : doc;
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
