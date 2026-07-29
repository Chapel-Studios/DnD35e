/**
 * FormulaResolver — core parsing, variable substitution, and aspect lookup.
 *
 * Tokenizes `#context.property` formulas, extracts/resolves variables against
 * a FamiliarSchema + live document data, and provides aspect-tree lookup
 * helpers (`getFieldAspect`, `findAspectByAccessPath`, `mergeAspectGroups`).
 *
 * Split out from FormulaResolver.mts to keep this file focused. Consumed by
 * FormulaResolver.mts as static methods.
 *
 * @module
 */
import { evaluateBooleanExpression } from './FormulaResolver.booleanGrammar.mjs';
import { resolveConditionalFormula } from './FormulaResolver.conditionalGrammar.mjs';
import type { AspectLookupResult } from './FormulaResolver.types.mjs';
import type { DocumentContext } from './registry.mjs';
import { normalizeLabel } from './schemaWalker.mjs';
import type {
  AspectGroup,
  FamiliarSchema,
  FieldAspect,
  FormulaToken,
  FormulaVariable,
} from './types.mjs';
import { isFieldAspect } from './types.mjs';

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
 *
 * A `#token` immediately followed by more identifier characters with no
 * separator (e.g. `#self.sneakAttackDiced6`) greedily matches as a single
 * (invalid) path segment rather than `#self.sneakAttackDice` + literal `d6` —
 * wrap the token in parens to disambiguate: `(#self.sneakAttackDice)d6`.
 *
 * `\#`, `\(`, `\)`, and `\,` all escape to their literal character (see the
 * final unescape step in `resolveFormula()`) — the comma escape matters for
 * `$conditional(...)` so a literal comma inside a quoted string value (e.g.
 * `when(#self.name == "\,", 500)`) isn't mistaken for the top-level comma
 * separating a clause's own arguments.
 */
// Unicode-aware: \p{L} = any letter, \p{N} = any digit — allows Polish/Czech/etc variable names
const VARIABLE_REGEX = /(?<!\\)#[\p{L}\p{N}_]+(?:\.(?:'[^']*'|'[^ ']*|[\p{L}\p{N}_]+))*/gu;

/**
 * Return a copy of `schema` with the given top-level aspect keys removed from
 * every context's properties.  Used to prevent circular references (e.g.
 * nameFormula must not reference `name`).
 *
 * Only strips keys at the root of each context's `properties` — nested paths
 * are not affected.
 */
export function filterExcludedFields(schema: FamiliarSchema, excludedFields: string[]): FamiliarSchema {
  if (!excludedFields.length) return schema;

  const filtered: FamiliarSchema = {};
  for (const [ctxName, ctx] of Object.entries(schema)) {
    const props = { ...ctx.properties };
    for (const key of excludedFields) {
      delete props[key];
      // Also delete the PascalCase-normalized form in case keys have been localized
      const normalized = normalizeLabel(key);
      if (normalized && normalized !== key) delete props[normalized];
    }
    filtered[ctxName] = { ...ctx, properties: props };
  }
  return filtered;
}

/**
 * Parse a formula into tokens (text and variables)
 * Handles #contextName.property.nested.path, #context.'raw.path' and partial syntax
 */
export function parseFormula(formula: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  const regex = new RegExp(VARIABLE_REGEX.source, 'gu');
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
export function parseVariableSegments(body: string): { context: string; path: string[]; customAccessPath?: string } {
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
  const regex = new RegExp(VARIABLE_REGEX.source, 'gu');
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
  // Pre-resolve $conditional(when(...) ... else(...)) blocks into their winning
  // branch's (still-unresolved) text before the generic token substitution below
  // runs — $conditional/when/else are not #context.property tokens themselves.
  const withConditionalsResolved = resolveConditionalFormula(
    formula,
    sub => resolveFormula(sub, familiarSchema, documentDataMap),
    resolvedCondition => evaluateBooleanExpression(resolvedCondition)
  );

  let result = withConditionalsResolved;
  const variables = extractVariables(withConditionalsResolved);

  // Process in reverse order to maintain string indices
  for (let i = variables.length - 1; i >= 0; i--) {
    const variable = variables[i];

    // Resolve context data: direct lookup first, then via familiarSchema alias
    let docData = documentDataMap[variable.context];
    if (!docData) {
      // variable.context may be a localized alias (e.g. 'Self') while documentDataMap
      // uses the internal key ('self'). Use the familiarSchema to bridge them.
      const ctxEntry = familiarSchema[variable.context]
        ? { key: variable.context, ctx: familiarSchema[variable.context] }
        : (() => {
          const found = Object.entries(familiarSchema).find(([, ctx]) =>
            ctx.aliases?.includes(variable.context)
          );
          return found ? { key: found[0], ctx: found[1] } : null;
        })();
      if (ctxEntry) {
        // Try the primary FamiliarSchema key in documentDataMap
        docData = documentDataMap[ctxEntry.key];
        if (!docData) {
          // Try each alias of that context in documentDataMap
          for (const alias of (ctxEntry.ctx.aliases ?? [])) {
            if (documentDataMap[alias]) { docData = documentDataMap[alias]; break; }
          }
        }
      }
    }
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

  // Unescape literal \# → #, \( → (, \) → ), \, → ,
  result = result.replace(/\\([#(),])/g, '$1');

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
  type: 'string' | 'number' | 'boolean',
  accessPath: string,
  context?: TContext
): FieldAspect {
  const prop: FieldAspect = { display, type, accessPath };
  if (context) {
    const raw = getNestedValue(context, accessPath);
    if (raw !== undefined && raw !== null) {
      prop.value = type === 'number'
        ? Number(raw)
        : type === 'boolean'
          ? (raw ? 'true' : 'false')
          : String(raw);
    }
  }
  return prop;
}

/**
 * Walk the familiar tree to find the FieldAspect at a given path.
 */
export function getFieldAspect(context: FamiliarSchema, contextName: string, path: string[]): FieldAspect | null {
  let contextSchema = context[contextName];

  if (!contextSchema) {
    const foundKey = Object.keys(context).find(k => context[k].aliases?.includes(contextName));
    if (foundKey) contextSchema = context[foundKey];
  }

  if (!contextSchema?.properties) return null;

  let current: unknown = contextSchema.properties;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return null;
    const obj = current as Record<string, unknown>;
    if (key in obj) {
      current = obj[key];
    } else {
      // Leaf alias fallback (FieldAspect.aliases)
      const leafAlias = Object.entries(obj).find(([, v]) =>
        isFieldAspect(v) && v.aliases?.includes(key)
      );
      if (leafAlias) {
        current = leafAlias[1];
        continue;
      }
      // Branch alias fallback (AspectGroup._aliases)
      const branchAlias = Object.entries(obj).find(([, v]) =>
        typeof v === 'object' && v !== null && !isFieldAspect(v)
        && (v as { _aliases?: string[] })._aliases?.includes(key)
      );
      if (branchAlias) {
        current = branchAlias[1];
        continue;
      }
      // Localized display name fallback
      const localDisplay = Object.entries(obj).find(([k, v]) => {
        if (k.startsWith('_')) return false;
        const localKey = isFieldAspect(v)
          ? normalizeLabel((v as FieldAspect).display)
          : normalizeLabel((v as AspectGroup)._display);
        return localKey === key;
      });
      if (localDisplay) {
        current = localDisplay[1];
      } else {
        return null;
      }
    }
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
 * Reverse-lookup: given a raw document `accessPath` (e.g. `system.hardness.value`),
 * find the FieldAspect and its familiar tree key path within an AspectGroup.
 *
 * Performs a depth-first search of the group tree, comparing each leaf's
 * `accessPath` against the target.
 */
export function findAspectByAccessPath(group: AspectGroup, accessPath: string): AspectLookupResult | null {
  for (const [key, value] of Object.entries(group)) {
    if (isFieldAspect(value)) {
      if (value.accessPath === accessPath) {
        return { aspect: value, treePath: [key] };
      }
    } else if (typeof value === 'object' && value !== null) {
      const nested = findAspectByAccessPath(value as AspectGroup, accessPath);
      if (nested) {
        return { aspect: nested.aspect, treePath: [key, ...nested.treePath] };
      }
    }
  }
  return null;
}

/**
 * Deep-merge multiple AspectGroups into one.
 *
 * - Nested groups merge recursively.
 * - Leaf conflicts (same key in multiple groups): first group wins.
 * - A leaf in one group and a branch in another: first group wins (no mixing).
 * - Branch metadata (`_display`/`_aliases`, set by the schema walker) is copied
 *   as-is from the first group that declares it — never recursed into. These are
 *   plain strings/string-arrays, not FieldAspect/AspectGroup nodes, so treating
 *   them as branches (as a naive `!isFieldAspect` check would) sends
 *   `Object.entries()` down a string's character indices, which — when two
 *   groups both declare the same metadata on the same branch (e.g. every
 *   ACTOR_TYPES subtype sharing one builder) — degenerates into merging
 *   single-character strings with themselves forever (infinite recursion).
 */
export function mergeAspectGroups(...groups: AspectGroup[]): AspectGroup {
  const result: AspectGroup = {};
  for (const group of groups) {
    for (const [key, value] of Object.entries(group)) {
      if (key.startsWith('_')) {
        // Branch metadata — first group wins, never merged/recursed into.
        if (result[key] === undefined) result[key] = value;
        continue;
      }
      const existing = result[key];
      if (existing === undefined) {
        // New key — take it
        result[key] = value;
      } else if (!isFieldAspect(existing) && !isFieldAspect(value)) {
        // Both are branches — recurse
        result[key] = mergeAspectGroups(existing as AspectGroup, value as AspectGroup);
      }
      // else: conflict (leaf vs leaf, or leaf vs branch) — first wins, skip
    }
  }
  return result;
}
