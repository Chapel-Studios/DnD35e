import { EFFECT_CHANGE_TARGET } from '@effects/baseActiveEffect/data/constants.mjs';
import { resolveMaskedActiveEffectChangeValue } from '@effects/baseActiveEffect/logic/resolveChangeValue.mjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests for `resolveMaskedActiveEffectChangeValue`.
 *
 * This is the mask-merge layer on top of the basic AE value resolver
 * (covered by secret-ae.test.mts). It only does meaningful work when the
 * target field is an `EmbeddedDataField` exposing the AE-aware hooks
 * `_castChangeDelta` and `_applyChangeOverride`. Everything else falls back
 * to the plain resolved value.
 *
 * Strategy: same mock pattern as secret-ae.test.mts (FormulaData / data map
 * passthrough). Per-test, we build an EmbeddedDataField subclass that
 * exposes vi.fn hooks so we can assert call shape and exercise error paths.
 */

vi.mock('@helpers/formulae/index.mjs', () => {
  return {
    FormulaData: {
      resolveSource: vi.fn((source: { formula: string }) => source.formula),
    },
    buildDocumentDataMap: vi.fn(
      (target: unknown, additional: Record<string, unknown>) => ({
        target,
        ...additional,
      })
    ),
  };
});

const { NumberField, EmbeddedDataField } = (globalThis as any).foundry.data.fields;

// --- Fixtures ------------------------------------------------------------
interface FieldStub {
  _castChangeDelta?: (raw: unknown, replacementData?: Record<string, unknown>) => unknown;
  _applyChangeOverride?: (
    current: unknown,
    delta: unknown,
    model: unknown,
    change: unknown
  ) => unknown;
}

function mkDoc (opts: {
  documentName: 'Item' | 'Actor';
  type: string;
  parent?: unknown;
  systemFields?: Record<string, unknown>;
  systemValues?: Record<string, unknown>;
  rollData?: Record<string, unknown>;
}) {
  const schema = {
    _getField: (path: string[]) => opts.systemFields?.[path.join('.')],
  };
  const system: any = {
    schema,
    ...opts.systemValues,
  };
  system.constructor = { schema };
  const doc: any = {
    documentName: opts.documentName,
    type: opts.type,
    parent: opts.parent ?? null,
    system,
  };
  if (opts.rollData !== undefined) {
    doc.getRollData = vi.fn(() => opts.rollData);
  }
  return doc;
}

function mkEffect (parent: unknown) {
  return { parent } as any;
}

function mkChange (overrides: Partial<{
  key: string;
  value: unknown;
  target: 'item' | 'actor';
}> = {}) {
  return {
    key: 'system.foo',
    value: 'raw-value',
    target: EFFECT_CHANGE_TARGET.ACTOR,
    ...overrides,
  } as any;
}

/**
 * Build a fresh EmbeddedDataField subclass exposing the AE-aware hooks as
 * vi.fns. Pass `omit` to drop a hook entirely (tests early-return branches).
 */
function mkAeAwareField (opts: {
  cast?: (raw: unknown, replacementData?: Record<string, unknown>) => unknown;
  override?: (current: unknown, delta: unknown, model: unknown, change: unknown) => unknown;
  omit?: 'cast' | 'override';
} = {}): any {
  const field: any = new EmbeddedDataField(class {}, {});
  if (opts.omit !== 'cast') {
    field._castChangeDelta = vi.fn(opts.cast ?? ((raw: unknown) => raw));
  }
  if (opts.omit !== 'override') {
    field._applyChangeOverride = vi.fn(
      opts.override ?? ((_current: unknown, delta: unknown) => delta)
    );
  }
  return field as FieldStub & { _castChangeDelta: any; _applyChangeOverride: any };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// =========================================================================
// Early-return branches → returns plain resolved value
// =========================================================================
describe('resolveMaskedActiveEffectChangeValue — fallthrough cases', () => {
  it('targetDocument === null (orphan item, target=ACTOR) → returns resolved value untouched', () => {
    const item = mkDoc({ documentName: 'Item', type: 'weapon' });
    const effect = mkEffect(item);
    const change = mkChange({ target: EFFECT_CHANGE_TARGET.ACTOR, value: 'x' });

    expect(resolveMaskedActiveEffectChangeValue(effect, change)).toBe('x');
  });

  it('schemaField undefined (key not under system.*) → returns resolved value', () => {
    const actor = mkDoc({ documentName: 'Actor', type: 'character' });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'name', value: 'Bob' });

    expect(resolveMaskedActiveEffectChangeValue(effect, change)).toBe('Bob');
  });

  it('schemaField is NumberField (not EmbeddedDataField) → returns resolved value', () => {
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { 'attributes.str': new NumberField({}) },
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'system.attributes.str', value: '5' });

    // NumberField path coerces "5" → 5; mask layer should pass that through.
    expect(resolveMaskedActiveEffectChangeValue(effect, change)).toBe(5);
  });

  it('EmbeddedDataField missing _castChangeDelta → returns resolved value', () => {
    const field = mkAeAwareField({ omit: 'cast' });
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { hp: field },
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'system.hp', value: 'X' });

    expect(resolveMaskedActiveEffectChangeValue(effect, change)).toBe('X');
    expect(field._applyChangeOverride).not.toHaveBeenCalled();
  });

  it('EmbeddedDataField missing _applyChangeOverride → returns resolved value', () => {
    const field = mkAeAwareField({ omit: 'override' });
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { hp: field },
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'system.hp', value: 'X' });

    expect(resolveMaskedActiveEffectChangeValue(effect, change)).toBe('X');
    expect(field._castChangeDelta).not.toHaveBeenCalled();
  });
});

// =========================================================================
// Happy path — AE-aware EmbeddedDataField
// =========================================================================
describe('resolveMaskedActiveEffectChangeValue — AE-aware EmbeddedDataField', () => {
  it('happy path: calls _castChangeDelta then _applyChangeOverride and returns its output', () => {
    const rollData = { str: 18 };
    const currentValue = { value: 10, max: 20 };
    const expectedDelta = { delta: true };
    const finalValue = { value: 15, max: 20 };

    const field = mkAeAwareField({
      cast: vi.fn(() => expectedDelta) as any,
      override: vi.fn(() => finalValue) as any,
    });
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { hp: field },
      systemValues: { hp: currentValue },
      rollData,
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'system.hp', value: 'X' });

    const result = resolveMaskedActiveEffectChangeValue(effect, change);

    expect(result).toBe(finalValue);
    expect(field._castChangeDelta).toHaveBeenCalledWith('X', rollData);
    expect(field._applyChangeOverride).toHaveBeenCalledWith(
      currentValue,        // current pulled via foundry.utils.getProperty
      expectedDelta,       // delta from _castChangeDelta
      actor.system,        // model = targetDocument.system
      change
    );
  });

  it('targetDocument without getRollData → uses {} as replacementData', () => {
    const field = mkAeAwareField();
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { hp: field },
      // no rollData → no getRollData fn
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'system.hp', value: 'X' });

    resolveMaskedActiveEffectChangeValue(effect, change);

    expect(field._castChangeDelta).toHaveBeenCalledWith('X', {});
  });

  it('current value read via foundry.utils.getProperty from targetDocument', () => {
    const field = mkAeAwareField();
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { 'attributes.hp': field },
      systemValues: { attributes: { hp: { value: 7 } } },
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'system.attributes.hp', value: 'X' });

    resolveMaskedActiveEffectChangeValue(effect, change);

    // foundry.utils.getProperty walks "system.attributes.hp" off the actor doc.
    expect(field._applyChangeOverride).toHaveBeenCalledWith(
      { value: 7 },
      expect.anything(),
      actor.system,
      change
    );
  });
});

// =========================================================================
// Error swallowing — try/catch returns plain resolved value
// =========================================================================
describe('resolveMaskedActiveEffectChangeValue — error paths', () => {
  it('_castChangeDelta throws → returns resolved value (fallback)', () => {
    const field = mkAeAwareField({
      cast: (() => { throw new Error('cast boom'); }) as any,
    });
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { hp: field },
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'system.hp', value: 'X' });

    expect(resolveMaskedActiveEffectChangeValue(effect, change)).toBe('X');
    expect(field._applyChangeOverride).not.toHaveBeenCalled();
  });

  it('_applyChangeOverride throws → returns resolved value (fallback)', () => {
    const field = mkAeAwareField({
      override: (() => { throw new Error('apply boom'); }) as any,
    });
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { hp: field },
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'system.hp', value: 'X' });

    expect(resolveMaskedActiveEffectChangeValue(effect, change)).toBe('X');
  });
});
