/**
 * FormulaResolver — formula & type validation.
 *
 * Validates `#context.property` variables against a FamiliarSchema and checks
 * whether a formula's resolved value matches its field's expected type.
 *
 * Split out from FormulaResolver.mts to keep this file focused. Consumed by
 * FormulaResolver.mts as static methods.
 *
 * @module
 */
import { extractVariables, getFieldAspect } from './FormulaResolver.aspectResolution.mjs';
import { evaluateBooleanExpression } from './FormulaResolver.booleanGrammar.mjs';
import { findConditionalBlocks } from './FormulaResolver.conditionalGrammar.mjs';
import { findFunctionBlocks } from './FormulaResolver.functionGrammar.mjs';
import { findUnbalancedParenIndices } from './FormulaResolver.parenUtils.mjs';
import { buildItFamiliarContext } from './itContext.mjs';
import { normalizeLabel } from './schemaWalker.mjs';
import type {
  AspectGroup,
  FamiliarContext,
  FamiliarSchema,
  FieldAspect,
  FormulaVariable,
  ValidationError,
} from './types.mjs';
import { isFieldAspect } from './types.mjs';

/**
 * Validate all variables in a formula
 * @param formula The formula string
 * @param context The familiar context
 * @param isFocused Whether the field is currently being actively typed in. When `true`,
 *   the generic whole-formula unbalanced-parens check (below) is suppressed — mirrors the
 *   yellow-while-focused/red-once-blurred convention `renderFormulaHTML`'s `isFocused`
 *   param already uses for paren highlighting, since a still-open `(` with nothing typed
 *   after it yet (e.g. `$conditional(`) is a normal, valid mid-typing state, not an error.
 *   Defaults to `false` (treat as a finished/at-rest formula) for callers that don't track
 *   focus (e.g. tests, one-shot validation).
 * @returns Array of validation errors (empty if valid)
 */
export function validateFormula(formula: string, context: FamiliarSchema, isFocused = false): ValidationError[] {
  if (!context) return [];
  const errors: ValidationError[] = [];
  const variables = extractVariables(formula);

  // A stray paren sitting outside every recognized `$conditional(...)`/
  // `$name(...)` keyword block (e.g. an extra leftover `(` typed before an
  // otherwise well-formed `$conditional(...)`) never surfaces via the
  // block-scoped checks below — each of those only inspects parens *within*
  // its own keyword's span. Check the whole formula's paren balance
  // separately so this class of typo still produces a real error (with
  // `context: ''`, so it surfaces in the form group's main hint banner)
  // instead of only the purely-visual per-character red paren highlighting
  // in `renderFormulaHTML`. Skipped entirely while still focused/typing —
  // otherwise a bare in-progress `$conditional(` (or any freshly-opened
  // paren with no closer typed yet) would flash a hard field-level error on
  // every keystroke before the user has had a chance to finish it.
  if (!isFocused) {
    for (const index of findUnbalancedParenIndices(formula)) {
      errors.push({
        variable: formula,
        context: '',
        path: [],
        error: game.i18n.localize('dnd35e.Formula.Errors.unbalancedParens'),
        severity: 'error',
        index,
      });
    }
  }

  // poc §7.2b: a well-formed $contains/$find/$any/$count(...) block (not
  // $stringContains, which has no predicate) makes `#it` a valid context —
  // but only *inside that block's own span* — scoped to its array's
  // object-element schema. Precompute those per-block `it` contexts once so
  // `#it.*` variables validate against the right schema instead of a false
  // "unknown context" error.
  const itBlocks: { startIndex: number; endIndex: number; itContext: FamiliarContext }[] = [];
  for (const block of findFunctionBlocks(formula)) {
    if (block.error || block.name === 'stringContains' || block.args.length < 2) continue;
    const itContext = buildItFamiliarContext(block.args[0], context);
    if (itContext) itBlocks.push({ startIndex: block.startIndex, endIndex: block.endIndex, itContext });
  }

  for (const variable of variables) {
    if (variable.context === 'it') {
      const owning = itBlocks.find(b => variable.startIndex >= b.startIndex && variable.endIndex <= b.endIndex);
      if (owning) {
        const error = validateVariable(variable, { ...context, it: owning.itContext });
        if (error) errors.push(error);
        continue;
      }
    }

    const error = validateVariable(variable, context);
    if (error) {
      errors.push(error);
    }
  }

  for (const block of findConditionalBlocks(formula)) {
    if (!block.error) continue;
    errors.push({
      variable: block.raw,
      context: 'conditional',
      path: [],
      error: game.i18n.localize(`dnd35e.Formula.Errors.conditional.${block.error}`),
      severity: 'error',
      index: block.startIndex,
    });
  }

  for (const block of findFunctionBlocks(formula)) {
    if (!block.error) continue;
    errors.push({
      variable: block.raw,
      context: 'function',
      path: [],
      error: game.i18n.format(`dnd35e.Formula.Errors.function.${block.error}`, { name: block.name }),
      severity: 'error',
      index: block.startIndex,
    });
  }

  return errors;
}

/**
 * Substitute #context.property variables using the *schema's cached values*
 * (`FieldAspect.value`) rather than a live document data map. Used for
 * lightweight type-mismatch checks in the editor, where only a FamiliarSchema
 * (not a full documentDataMap) is available.
 *
 * When a variable resolves to a known FieldAspect but has no cached `.value`
 * (e.g. no live parent document — a merged fallback schema built without
 * context, as when editing an orphaned/standalone effect), a type-appropriate
 * placeholder ('0' / 'false' / '""') is substituted instead of leaving the
 * variable unresolved. This still lets grammar/type validation run — e.g.
 * catching `!#item.broken 0` (two adjacent expressions, no operator) — without
 * needing real live data, since the *shape* of a formula doesn't depend on the
 * variable's actual runtime value. Variables with no matching aspect at all
 * (invalid/unresolvable path — already flagged separately by `validateFormula`)
 * or custom quoted paths are left as-is.
 */
function resolveFormulaFromSchemaValues(formula: string, schema: FamiliarSchema): string {
  let result = formula;
  const variables = extractVariables(formula);

  for (let i = variables.length - 1; i >= 0; i--) {
    const variable = variables[i];
    if (variable.customAccessPath !== undefined) continue;

    const aspect = getFieldAspect(schema, variable.context, variable.path);
    if (!aspect) continue;

    const placeholder = aspect.type === 'number'
      ? '0'
      : aspect.type === 'boolean'
        ? 'false'
        : '""';
    const value = aspect.value ?? placeholder;

    result =
      result.substring(0, variable.startIndex) +
      String(value) +
      result.substring(variable.endIndex);
  }

  return result;
}

/**
 * Check whether a formula's resolved value matches its field's `expectedType`.
 * Surfaces a validation error instead of silently falling back — a `number`-typed
 * field whose formula resolves to a boolean/non-numeric string, or a
 * `boolean`-typed field whose formula isn't a valid comparison/logical
 * expression, both produce an error here.
 *
 * Known variables are substituted with either their live/cached value or a
 * type-appropriate placeholder (see `resolveFormulaFromSchemaValues`), so
 * grammar errors (e.g. `!#item.broken 0`) are still caught even without a live
 * document to resolve real values from.
 *
 * Returns `null` when the type is `'string'` (no coercion possible to fail),
 * the formula is empty, or any variable couldn't be resolved to a known
 * schema aspect at all (invalid/unresolvable path — flagged separately by
 * `validateFormula`).
 */
export function validateFormulaType(
  formula: string,
  context: FamiliarSchema,
  expectedType: 'string' | 'number' | 'boolean'
): ValidationError | null {
  if (!formula || expectedType === 'string') return null;

  const resolved = resolveFormulaFromSchemaValues(formula, context);
  if (extractVariables(resolved).length > 0) return null;
  // `resolveFormulaFromSchemaValues` only substitutes `#context.property`
  // variables — it never resolves `$conditional`/`$contains`/`$find`/`$any`/
  // `$count`/`$stringContains` blocks (that needs a live document, which this
  // schema-only editor check doesn't have). Any unescaped `$` left in the
  // resolved text means the formula's final value can't be determined here —
  // bail rather than force-coercing raw `$...` syntax through `Number()`/
  // `Roll.safeEval()`/`evaluateBooleanExpression()`, which would always fail.
  // This also covers the still-typing case (`$`, `$c`, `$contains(` with no
  // closing paren yet) — an in-progress `$` block isn't a type error either.
  if (/(?<!\\)\$/.test(resolved)) return null;

  if (expectedType === 'number') {
    const trimmed = resolved.trim();
    if (!trimmed) return null;
    if (!Number.isNaN(Number(trimmed))) return null;
    try {
      if (!Number.isNaN(Roll.safeEval(trimmed))) return null;
    } catch {
      // fall through to error
    }
    return {
      variable: formula,
      context: '',
      path: [],
      error: game.i18n.format('dnd35e.Formula.Errors.notANumber', { resolved }),
      severity: 'error',
      index: 0,
    };
  }

  // expectedType === 'boolean'
  try {
    evaluateBooleanExpression(resolved);
    return null;
  } catch {
    return {
      variable: formula,
      context: '',
      path: [],
      error: game.i18n.localize('dnd35e.Formula.Errors.notABoolean'),
      severity: 'error',
      index: 0,
    };
  }
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
      error: game.i18n.format('dnd35e.Formula.Errors.contextNotFound', { context: variable.context }),
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
      error: game.i18n.format('dnd35e.Formula.Errors.incompleteReference', { context: variable.context }),
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
        error: game.i18n.format('dnd35e.Formula.Errors.propertyNotFound', {
          key,
          path: `${variable.context}${pathTraversed.length > 0
            ? '.' + pathTraversed.join('.')
            : ''}`,
        }),
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
              error: game.i18n.format('dnd35e.Formula.Errors.propertyNotFound', {
                key,
                path: `${variable.context}${pathTraversed.length > 0
                  ? '.' + pathTraversed.join('.')
                  : ''}`,
              }),
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
      error: game.i18n.format('dnd35e.Formula.Errors.notAProperty', { variable: variable.variable }),
      severity: 'warning',
      index: variable.startIndex,
    };
  }

  variable.isValid = true;
  return null;
}
