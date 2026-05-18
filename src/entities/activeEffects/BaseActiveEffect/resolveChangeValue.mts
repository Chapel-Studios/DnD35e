import type { Dnd35eEffectChangeData } from '@effects/BaseActiveEffect/data/ActiveEffectSystemData.mjs';
import { EFFECT_CHANGE_TARGET } from '@effects/BaseActiveEffect/data/constants.mjs';
import { buildDocumentDataMap, FormulaData } from '@helpers/formulae/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';

import type { Dnd35eActiveEffect } from './Dnd35eActiveEffect.mjs';

const {
  BooleanField,
  EmbeddedDataField,
  NumberField,
} = foundry.data.fields;

type SupportedEffectParent = foundry.documents.Actor | ItemDnd35e | null;

function getEffectContexts(
  effect: Dnd35eActiveEffect,
  change: Dnd35eEffectChangeData
): {
  targetDocument: foundry.abstract.Document | null;
  schemaField?: foundry.data.fields.DataField;
  contextMap?: Record<string, any>;
} {
  const parent = effect.parent as SupportedEffectParent;
  const item = parent?.documentName === 'Item'
    ? parent as ItemDnd35e
    : null;
  const actor = parent?.documentName === 'Actor'
    ? parent
    : item?.parent ?? null;

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

  const contextMap = buildDocumentDataMap(targetDocument, additionalContexts);

  let schemaField: foundry.data.fields.DataField | undefined;
  if (change.key.startsWith('system.')) {
    const systemModel = targetDocument.system as foundry.abstract.DataModel | undefined;
    const schema = ((systemModel?.constructor as {
      schema?: { _getField?: (path: string[]) => foundry.data.fields.DataField | undefined };
    } | undefined)?.schema) ?? systemModel?.schema;
    schemaField = schema?._getField?.(change.key.replace(/^system\./, '').split('.'));
  }

  return { targetDocument, schemaField, contextMap };
}

function tryEvaluateNumber(expression: string): number | null {
  const trimmed = expression.trim();
  if (!trimmed) return null;

  const numericValue = Number(trimmed);
  if (!Number.isNaN(numericValue)) return numericValue;

  try {
    const safeEval = (Roll as unknown as { safeEval?: (formula: string) => number }).safeEval;
    if (safeEval) {
      const evaluated = safeEval(trimmed);
      return Number.isNaN(evaluated) ? null : evaluated;
    }
  } catch {
    return null;
  }

  return null;
}

function resolveActiveEffectChangeValue(
  effect: Dnd35eActiveEffect,
  change: Dnd35eEffectChangeData
): unknown {
  const rawValue = change.value;
  if (typeof rawValue !== 'string') return rawValue;

  const { schemaField, contextMap } = getEffectContexts(effect, change);
  if (!contextMap) return rawValue;

  const resolvedValue = FormulaData.resolveSource({
    formula: rawValue,
    resolvedValue: null,
    expectedType: schemaField instanceof NumberField ? 'number' : 'string',
  }, contextMap, rawValue);

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
  effect: Dnd35eActiveEffect,
  change: Dnd35eEffectChangeData
): unknown {
  const resolvedValue = resolveActiveEffectChangeValue(effect, change);
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
      change: Dnd35eEffectChangeData
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

function resolveActiveEffectChange(
  effect: Dnd35eActiveEffect,
  change: Dnd35eEffectChangeData
): Dnd35eEffectChangeData {
  const resolvedValue = resolveActiveEffectChangeValue(effect, change);
  if (resolvedValue === change.value) return change;

  return {
    ...change,
    value: resolvedValue,
  };
}

export { getEffectContexts, resolveActiveEffectChange, resolveActiveEffectChangeValue, resolveMaskedActiveEffectChangeValue };