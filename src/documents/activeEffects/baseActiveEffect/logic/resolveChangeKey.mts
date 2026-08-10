/**
 * AE Conditional Change Key Resolution
 *
 * Resolves a `change.key` that contains a `$conditional(when()else())` block (authored via
 * `AspectPicker`'s advanced editor) into a single literal raw accessPath, evaluated in order
 * — first matching `when()`'s branch wins, `else()` is the fallback. Runs during the change-
 * gathering loop in `ActorDnd35e`/`ItemDnd35e.applyActiveEffects()`, BEFORE the resolved key
 * reaches `resolveActiveEffectChange()`/`applyStackedActiveEffectChanges()` — those, and
 * Foundry core's `ActiveEffect.applyChange()`, only ever see a plain literal path.
 *
 * A key with no `$conditional(` is returned unchanged (fast path) — the common case.
 *
 * Failure handling: any single unresolvable piece (malformed block, a `when()` condition
 * that doesn't evaluate to a valid boolean, or a branch target that doesn't resolve to a
 * real field) is treated exactly like a bad variable anywhere else in a formula — a
 * `PreparationWarning` is recorded and the whole change is skipped (`KEY_RESOLUTION_FAILED`),
 * never silently falling back to a different branch.
 */
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { PreparationWarningHost } from '@documents/document/preparationWarnings.mjs';
import { pushPreparationWarningToHosts } from '@documents/document/preparationWarnings.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import { FormulaResolver } from '@helpers/formulae/FormulaResolver.mjs';
import type { ContextDocumentType } from '@helpers/formulae/registry.mjs';
import { getFamiliarBuilder } from '@helpers/formulae/registry.mjs';
import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
import { resolveFamiliarLeafToAccessPath } from '@helpers/formulae/utils.mjs';

import type { ActiveEffectDnd35e } from '../ActiveEffectDnd35e.mjs';
import { getEffectContexts, getEffectParents } from './resolveChangeValue.mjs';

/** Sentinel returned when a conditional `change.key` failed to resolve — callers must skip applying the change entirely, a `PreparationWarning` has already been recorded. */
const KEY_RESOLUTION_FAILED = Symbol('keyResolutionFailed');

/**
 * Build a FamiliarSchema keyed by the effect's live item/actor parents — the same shape
 * `AspectPicker`'s advanced editor offered at authoring time (subtype name, aliased to
 * `item`/`actor`), so a stored `#item.foo`/`#weapon.foo` branch target resolves the same
 * way here as it did in the editor.
 */
function buildKeyResolutionSchema(effect: ActiveEffectDnd35e): FamiliarSchema {
  const { item, actor } = getEffectParents(effect);
  const schema: FamiliarSchema = {};

  if (item) {
    const builder = getFamiliarBuilder('Item', item.type as ContextDocumentType);
    if (builder) schema[item.type] = { properties: builder(item), aliases: ['item'] };
  }
  if (actor) {
    const builder = getFamiliarBuilder('Actor', actor.type as ContextDocumentType);
    if (builder) schema[actor.type] = { properties: builder(actor as ActorDnd35e), aliases: ['actor'] };
  }

  return schema;
}

/**
 * @param effect The ActiveEffect defining `change` — used to resolve live item/actor
 *   parents for both condition evaluation and branch-target resolution.
 * @param change The change whose `key` should be resolved.
 * @param warnHost Document to record a `PreparationWarning` on if resolution fails (the
 *   actor/item applying the change — see `ActorDnd35e`/`ItemDnd35e.applyActiveEffects()`).
 * @returns The literal raw accessPath to write to, or `change.key` unchanged when it isn't
 *   a `$conditional(...)` block, or `KEY_RESOLUTION_FAILED` when resolution fails.
 */
function resolveActiveEffectChangeKey(
  effect: ActiveEffectDnd35e,
  change: EffectChangeDataDnd35e,
  warnHost?: PreparationWarningHost
): string | typeof KEY_RESOLUTION_FAILED {
  const rawKey = change.key;
  if (!rawKey || !rawKey.includes('$conditional(')) return rawKey;

  const fail = (reason: string): typeof KEY_RESOLUTION_FAILED => {
    console.error(`resolveActiveEffectChangeKey: ${reason}`);
    pushPreparationWarningToHosts([warnHost, effect as unknown as PreparationWarningHost], rawKey, reason);
    return KEY_RESOLUTION_FAILED;
  };

  const [block, ...extraBlocks] = FormulaResolver.findConditionalBlocks(rawKey);
  if (!block || block.error || extraBlocks.length > 0) {
    return fail(`Conditional key "${rawKey}" is malformed${block?.error ? ` (${block.error})` : ''}`);
  }

  const { contextMap } = getEffectContexts(effect, change);
  if (!contextMap) {
    return fail(`Conditional key "${rawKey}": no document to resolve against for target "${change.target ?? 'actor'}"`);
  }

  let winningTarget: string | null = null;
  for (const clause of block.whenClauses) {
    let failed = false;
    const resolved = FormulaData.resolveSource(
      { formula: clause.condition, resolvedValue: null, expectedType: 'boolean' },
      contextMap,
      '',
      [],
      () => { failed = true; }
    );
    if (failed || (resolved !== 'true' && resolved !== 'false')) {
      return fail(`Conditional key "${rawKey}": when() condition "${clause.condition}" did not resolve to a valid boolean expression`);
    }
    if (resolved === 'true') {
      winningTarget = clause.value;
      break;
    }
  }
  if (winningTarget === null) {
    if (block.elseValue === null) return fail(`Conditional key "${rawKey}" has no else() and no when() clause matched`);
    winningTarget = block.elseValue;
  }

  const schema = buildKeyResolutionSchema(effect);
  const accessPath = resolveFamiliarLeafToAccessPath(winningTarget, schema);
  if (!accessPath) return fail(`Conditional key "${rawKey}": target "${winningTarget}" did not resolve to a real field`);

  return accessPath;
}

export { KEY_RESOLUTION_FAILED, resolveActiveEffectChangeKey };
