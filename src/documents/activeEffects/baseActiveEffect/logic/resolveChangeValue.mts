import type { PreparationWarningHost } from '@documents/document/preparationWarnings.mjs';
import { pushPreparationWarningToHosts } from '@documents/document/preparationWarnings.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import { EFFECT_CHANGE_TARGET } from '@effects/baseActiveEffect/data/constants.mjs';
import { getSchemaField } from '@fields/getSchemaField.mjs';
import { buildDocumentDataMap, FormulaData } from '@helpers/formulae/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';

import type { ActiveEffectDnd35e } from '../ActiveEffectDnd35e.mjs';

const {
  BooleanField,
  EmbeddedDataField,
  NumberField,
} = foundry.data.fields;

type SupportedEffectParent = foundry.documents.Actor | ItemDnd35e | null;

/**
 * Resolve an effect's owning item/actor from its parent chain — shared by
 * `getEffectContexts` (below) and `resolveActiveEffectChangeKey.mts` (which needs the
 * live documents directly, not just the derived `contextMap`, to build a FamiliarSchema
 * for translating a `$conditional(...)` branch's `#context.property` target into a raw
 * accessPath).
 */
function getEffectParents(effect: ActiveEffectDnd35e): { item: ItemDnd35e | null; actor: SupportedEffectParent } {
  const parent = effect.parent as SupportedEffectParent;
  const item = parent?.documentName === 'Item'
    ? parent as ItemDnd35e
    : null;
  const actor = parent?.documentName === 'Actor'
    ? parent
    : item?.parent ?? null;
  return { item, actor };
}

function getEffectContexts(
  effect: ActiveEffectDnd35e,
  change: EffectChangeDataDnd35e
): {
  targetDocument: foundry.abstract.Document | null;
  schemaField?: foundry.data.fields.DataField;
  contextMap?: Record<string, any>;
} {
  const { item, actor } = getEffectParents(effect);

  const targetDocument = (change.target ?? EFFECT_CHANGE_TARGET.ACTOR) === EFFECT_CHANGE_TARGET.ITEM
    ? item
    : actor;

  if (!targetDocument) {
    return { targetDocument: null };
  }

  const additionalContexts: Record<string, any> = {};
  if (item) {
    additionalContexts.item = item;
    additionalContexts.Item = item;
    additionalContexts[item.type] = item;
  }
  if (actor) {
    additionalContexts.actor = actor;
    additionalContexts.Actor = actor;
    additionalContexts.Owner = actor;
    additionalContexts[actor.type] = actor;
  }

  // `self` must be the effect authoring the change, not `targetDocument` — matching
  // authoring-time semantics (see `EffectChangesList.vue`'s `schema.self`), a change
  // targeting the item should still let `#self.name` mean the *effect's* name, not the
  // item's (which is already reachable via `item`/`Item`/`<item.type>` below).
  const contextMap = buildDocumentDataMap(effect, additionalContexts);

  const schemaField = getSchemaField(targetDocument, change.key);

  return { targetDocument, schemaField, contextMap };
}

function tryEvaluateNumber(expression: string): number | null {
  const trimmed = expression.trim();
  if (!trimmed) return null;

  const numericValue = Number(trimmed);
  if (!Number.isNaN(numericValue)) return numericValue;

  try {
    const evaluated = Roll.safeEval(trimmed);
    return Number.isNaN(evaluated)
      ? null
      : evaluated;
  } catch {
    return null;
  }
}

/** Sentinel returned when a change's value formula failed to resolve — callers must skip applying the change entirely rather than coercing this into a real value (e.g. `0`/`false`). */
const FORMULA_RESOLUTION_FAILED = Symbol('formulaResolutionFailed');

function resolveActiveEffectChangeValue(
  effect: ActiveEffectDnd35e,
  change: EffectChangeDataDnd35e,
  warnHost?: PreparationWarningHost
): unknown {
  const rawValue = change.value;
  if (typeof rawValue !== 'string') return rawValue;

  const { schemaField, contextMap, targetDocument } = getEffectContexts(effect, change);
  if (!contextMap) {
    // No document to resolve against (e.g. `change.target` resolved to "item" but this
    // effect has no item parent) — never silently drop a formula-looking value, warn.
    if (rawValue.includes('#')) {
      pushPreparationWarningToHosts(
        [warnHost ?? (targetDocument as unknown as PreparationWarningHost | null), effect as unknown as PreparationWarningHost],
        change.key,
        `Value formula "${rawValue}": no "${change.target ?? EFFECT_CHANGE_TARGET.ACTOR}" document to resolve against`
      );
    }
    return rawValue;
  }

  let failed = false;
  const resolvedValue = FormulaData.resolveSource({
    formula: rawValue,
    resolvedValue: null,
    expectedType: schemaField instanceof NumberField ? 'number' : 'string',
  }, contextMap, rawValue, [], (reason) => {
    failed = true;
    pushPreparationWarningToHosts(
      [warnHost ?? (targetDocument as unknown as PreparationWarningHost | null), effect as unknown as PreparationWarningHost],
      change.key,
      `Value formula "${rawValue}": ${reason}`
    );
  });

  if (failed || resolvedValue === null) return FORMULA_RESOLUTION_FAILED;

  if (schemaField instanceof NumberField) {
    return tryEvaluateNumber(resolvedValue) ?? rawValue;
  }

  if (schemaField instanceof BooleanField) {
    if (resolvedValue === 'true') return true;
    if (resolvedValue === 'false') return false;
  }

  return resolvedValue;
}

function resolveMaskedActiveEffectChangeValue(
  effect: ActiveEffectDnd35e,
  change: EffectChangeDataDnd35e
): unknown {
  const resolvedValue = resolveActiveEffectChangeValue(effect, change);
  if (resolvedValue === FORMULA_RESOLUTION_FAILED) return undefined;

  const { targetDocument, schemaField } = getEffectContexts(effect, change);

  if (!targetDocument || !schemaField || !(schemaField instanceof EmbeddedDataField)) {
    return resolvedValue;
  }

  const aeAwareField = schemaField as unknown as {
    _castChangeDelta?: (raw: unknown, replacementData?: Record<string, unknown>) => unknown;
    _applyChangeOverride?: (
      current: unknown,
      delta: unknown,
      model: foundry.abstract.DataModel,
      change: EffectChangeDataDnd35e
    ) => unknown;
  };

  if (typeof aeAwareField._castChangeDelta !== 'function' || typeof aeAwareField._applyChangeOverride !== 'function') {
    return resolvedValue;
  }

  try {
    const currentValue = foundry.utils.getProperty(targetDocument, change.key);
    const replacementData = (targetDocument as { getRollData?: () => Record<string, unknown> }).getRollData?.() ?? {};
    const targetDocumentWithSystem = targetDocument as foundry.abstract.Document & {
      system?: foundry.abstract.DataModel;
    };
    const delta = aeAwareField._castChangeDelta(resolvedValue, replacementData);
    return aeAwareField._applyChangeOverride(
      currentValue,
      delta,
      targetDocumentWithSystem.system ?? targetDocument as unknown as foundry.abstract.DataModel,
      change
    );
  } catch {
    return resolvedValue;
  }
}

/**
 * @returns The change with its `value` resolved, or `null` if the value formula failed to
 *   resolve — callers must skip applying the change entirely (see `ActorDnd35e`/
 *   `ItemDnd35e.applyActiveEffects()`), a `PreparationWarning` has already been recorded.
 */
function resolveActiveEffectChange(
  effect: ActiveEffectDnd35e,
  change: EffectChangeDataDnd35e,
  warnHost?: PreparationWarningHost
): EffectChangeDataDnd35e | null {
  const resolvedValue = resolveActiveEffectChangeValue(effect, change, warnHost);
  if (resolvedValue === FORMULA_RESOLUTION_FAILED) return null;
  if (resolvedValue === change.value) return change;

  return {
    ...change,
    value: resolvedValue,
  };
}

export {
  getEffectContexts,
  getEffectParents,
  resolveActiveEffectChange,
  resolveActiveEffectChangeValue,
  resolveMaskedActiveEffectChangeValue,
};
