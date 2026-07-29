/**
 * AE Change Conditional Gate
 *
 * Evaluates a single change's optional `condition` — a string-form formula resolved
 * through FormulaFamiliar's boolean grammar. Conditions must be strings: they're
 * persisted to the database, so a function form could never round-trip.
 *
 * A missing/null condition always passes (current behavior, unchanged).
 */
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import { FormulaData } from '@helpers/formulae/FormulaData.mjs';

/**
 * @param change The change whose `condition` should be evaluated.
 * @param contextMap Pre-built context map for resolution (from `getEffectContexts()`).
 *   Omit for changes with no backing AE document (e.g. live-contributed changes) — a
 *   condition with no contextMap surfaces a warning and is treated as `false`.
 * @returns `true` when the change should apply, `false` when it should be skipped.
 */
function evaluateChangeCondition(
  change: EffectChangeDataDnd35e,
  contextMap?: Record<string, unknown>
): boolean {
  const condition = change.condition;
  if (!condition) return true;

  if (!contextMap) {
    console.warn(`evaluateChangeCondition: no context map available to resolve condition "${condition}" for change targeting "${change.key}"`);
    return false;
  }

  const resolved = FormulaData.resolveSource(
    { formula: condition, resolvedValue: null, expectedType: 'boolean' },
    contextMap
  );

  if (resolved !== 'true' && resolved !== 'false') {
    console.error(`evaluateChangeCondition: condition "${condition}" did not resolve to a valid boolean expression (got "${resolved}") for change targeting "${change.key}"`);
    return false;
  }

  return resolved === 'true';
}

export { evaluateChangeCondition };
