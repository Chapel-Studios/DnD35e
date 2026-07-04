/**
 * FormulaFormGroup Utility Functions
 * Core parsing, validation, and resolution logic
 */
import type { FormulaDataSource } from './FormulaData.mjs';
import { FormulaData } from './FormulaData.mjs';
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
      // Also delete the PascalCase-normalized form in case keys have been localized
      const normalized = normalizeLabel(key);
      if (normalized && normalized !== key) delete props[normalized];
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
// Unicode-aware: \p{L} = any letter, \p{N} = any digit — allows Polish/Czech/etc variable names
const VARIABLE_REGEX = /(?<!\\)#[\p{L}\p{N}_]+(?:\.(?:'[^']*'|'[^ ']*|[\p{L}\p{N}_]+))*/gu;

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
  let result = formula;
  const variables = extractVariables(formula);

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

/** Result of a reverse-lookup from a raw document path to the familiar tree. */
export interface AspectLookupResult {
  /** The FieldAspect that matched. */
  aspect: FieldAspect;
  /** The familiar tree path segments (e.g., ['hp', 'max']). */
  treePath: string[];
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
 */
export function mergeAspectGroups(...groups: AspectGroup[]): AspectGroup {
  const result: AspectGroup = {};
  for (const group of groups) {
    for (const [key, value] of Object.entries(group)) {
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
  const variables = extractVariables(formula);
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
  const variables = extractVariables(formula);
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
    // Try to find by alias or localized display name
    const foundKey = Object.keys(context).find(k =>
      context[k].aliases?.includes(variable.context)
      || (normalizeLabel(context[k].display) ?? '') === variable.context
    );
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
    if (typeof current !== 'object' || current === null) {
      return {
        variable: variable.variable,
        context: variable.context,
        path: variable.path,
        error: `Property '${key}' not found on ${variable.context}${pathTraversed.length > 0 ? '.' + pathTraversed.join('.') : ''}`,
        severity: 'error',
        index: variable.startIndex,
      };
    }

    const obj = current as Record<string, unknown>;
    if (key in obj) {
      current = obj[key];
    } else {
      // Alias fallback — check leaf aliases then branch _aliases
      const leafAlias = Object.entries(obj).find(([, v]) =>
        isFieldAspect(v) && v.aliases?.includes(key)
      );
      if (leafAlias) {
        current = leafAlias[1];
      } else {
        const branchAlias = Object.entries(obj).find(([, v]) =>
          typeof v === 'object' && v !== null && !isFieldAspect(v)
          && (v as { _aliases?: string[] })._aliases?.includes(key)
        );
        if (branchAlias) {
          current = branchAlias[1];
        } else {
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
            return {
              variable: variable.variable,
              context: variable.context,
              path: variable.path,
              error: `Property '${key}' not found on ${variable.context}${pathTraversed.length > 0 ? '.' + pathTraversed.join('.') : ''}`,
              severity: 'error',
              index: variable.startIndex,
            };
          }
        }
      }
    }
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

export function renderFormulaDisplayHTML(
  formula: string,
  familiarSchema?: FamiliarSchema
): string {
  const tokens = parseFormula(formula);

  return tokens
    .map(token => {
      if (token.type === 'text') {
        return escapeHTML(token.value);
      }

      if (token.partial) {
        return `<span class="formula-variable is-warning">${escapeHTML(token.value)}</span>`;
      }

      const body = token.value.substring(1);
      const { context, path } = parseVariableSegments(body);
      if (!familiarSchema || path.length === 0) {
        return `<span class="formula-variable">${escapeHTML(token.value)}</span>`;
      }

      const value = getPropertyValue(familiarSchema, context, path);
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
  return resolveFormula(formulaData.formula, familiarSchema, documentDataMap);
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
