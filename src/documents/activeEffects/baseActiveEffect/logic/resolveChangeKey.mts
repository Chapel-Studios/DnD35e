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
 * A key with no `$conditional(` skips block resolution (fast path — the common case) but
 * still passes through `remapNameKey()` below, then the same literal-field-existence
 * check every resolved key gets (see the final check at the bottom of the function).
 *
 * Failure handling: any single unresolvable piece (malformed block, a `when()` condition
 * that doesn't evaluate to a valid boolean, a branch target that doesn't resolve to a
 * real field, or a final literal key that isn't a real field on the target document) is
 * treated exactly like a bad variable anywhere else in a formula — a `PreparationWarning`
 * is recorded and the whole change is skipped (`KEY_RESOLUTION_FAILED`), never silently
 * falling back to a different branch.
 */
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { PreparationWarningHost } from '@documents/document/preparationWarnings.mjs';
import { pushPreparationWarningToHosts } from '@documents/document/preparationWarnings.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import { EFFECT_CHANGE_TARGET } from '@effects/baseActiveEffect/data/constants.mjs';
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
 * `name` is a live-computed getter with no writable backing field on BOTH `ItemDnd35e`
 * (derived from `system.nameFormula`, see `getDisplayName.mts`) and `ActorDnd35e` (same
 * `nameFormula` resolution, layered under the Secret-AE viewer mask — poc.10 Story I).
 * Core's `ActiveEffect.applyChangeField()` would call `foundry.utils.setProperty(targetDoc,
 * 'name', value)`, a plain assignment that throws against a getter-only accessor in strict
 * mode — every ordinary (non-`mask`-type) change resolving to literal `name`, on either
 * target, is redirected onto the real, writable `system.nameFormula.formula` field instead,
 * which both `name` getters already resolve through.
 */
function remapNameKey(key: string): string {
  return key === 'name' ? 'system.nameFormula.formula' : key;
}

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
 * @param warnHost Document(s) to record a `PreparationWarning` on if resolution fails (the
 *   actor/item applying the change — see `ActorDnd35e`/`ItemDnd35e.applyActiveEffects()`;
 *   an item-owned effect applying an actor-targeted change passes both the actor and the
 *   owning item so both sheets surface the warning).
 * @returns The literal raw accessPath to write to (with `name` remapped to
 *   `system.nameFormula.formula` on every target — see `remapNameKey()`),
 *   or `KEY_RESOLUTION_FAILED` when a `$conditional(...)` block fails to resolve, or when
 *   the final literal key doesn't resolve to a real field on the target document.
 */
function resolveActiveEffectChangeKey(
  effect: ActiveEffectDnd35e,
  change: EffectChangeDataDnd35e,
  warnHost?: PreparationWarningHost | PreparationWarningHost[]
): string | typeof KEY_RESOLUTION_FAILED {
  const rawKey = change.key;

  const fail = (reason: string): typeof KEY_RESOLUTION_FAILED => {
    console.error(`resolveActiveEffectChangeKey: ${reason}`);
    pushPreparationWarningToHosts(
      [
        warnHost,
        effect as unknown as PreparationWarningHost,
      ],
      rawKey,
      reason,
      'warning',
      { id: `change:${change.id ?? change.key}:key:resolution` }
    );
    return KEY_RESOLUTION_FAILED;
  };

  let resolvedKey: string;

  if (!rawKey || !rawKey.includes('$conditional(')) {
    resolvedKey = remapNameKey(rawKey);
  } else {
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
      if (failed || (resolved !== true && resolved !== false)) {
        return fail(`Conditional key "${rawKey}": when() condition "${clause.condition}" did not resolve to a valid boolean expression`);
      }
      if (resolved === true) {
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

    resolvedKey = remapNameKey(accessPath);
  }

  // A plain (non-conditional) key skips every check above entirely, so without this it
  // would get zero validation at all. Group Change Target keys (poc §7.7, e.g.
  // "#actor.saves.all") are real formula references, not literal paths — they fan out to
  // many concrete fields later in `expandChangeTargetGroups()`, so they're exempt here.
  if (!resolvedKey.startsWith('#')) {
    const { targetDocument } = getEffectContexts(effect, { ...change, key: resolvedKey });
    if (targetDocument && !foundry.utils.hasProperty(targetDocument, resolvedKey)) {
      return fail(`Key "${resolvedKey}" does not resolve to a real field on the ${change.target ?? EFFECT_CHANGE_TARGET.ACTOR}`);
    }
  }

  return resolvedKey;
}

export { KEY_RESOLUTION_FAILED, resolveActiveEffectChangeKey };
