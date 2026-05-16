import { EFFECT_CHANGE_TARGET } from '@effects/BaseActiveEffect/data/constants.mjs';
import {
  getEffectContexts,
  resolveActiveEffectChangeValue,
} from '@effects/BaseActiveEffect/resolveChangeValue.mjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests for the Secret AE value resolution layer.
 *
 * Strategy: mock `@helpers/formulae` so we control what comes back from
 * `FormulaData.resolveSource` and `buildDocumentDataMap`. We are NOT testing
 * formula evaluation here — only:
 *
 * 1. `getEffectContexts` — parent walking, target selection (item vs actor),
 *    contextMap population, schemaField lookup via `system.constructor.schema`.
 * 2. `resolveActiveEffectChangeValue` — string-vs-non-string passthrough,
 *    coercion via NumberField / BooleanField, fallback when contextMap is
 *    absent, fallback when Roll.safeEval can't evaluate.
 *
 * Formula evaluation correctness belongs to formula-specific tests.
 */

// --- Mock @helpers/formulae ----------------------------------------------
// Resolve returns whatever the test wires up; buildDocumentDataMap returns
// the additional contexts unchanged so we can inspect what got passed in.
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

const { NumberField, BooleanField, StringField } = (globalThis as any).foundry.data.fields;

// --- Fixtures ------------------------------------------------------------
interface SchemaStub {
  _getField: (path: string[]) => unknown;
}

function mkDoc (opts: {
  documentName: 'Item' | 'Actor';
  type: string;
  parent?: unknown;
  systemFields?: Record<string, unknown>;
}) {
  const schema: SchemaStub = {
    _getField: (path: string[]) => opts.systemFields?.[path.join('.')],
  };
  const system: any = { schema };
  // Mirror how the resolver introspects: `system.constructor.schema`.
  system.constructor = { schema };
  return {
    documentName: opts.documentName,
    type: opts.type,
    parent: opts.parent ?? null,
    system,
  } as any;
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
    value: '5',
    target: EFFECT_CHANGE_TARGET.ACTOR,
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// =========================================================================
// getEffectContexts
// =========================================================================
describe('getEffectContexts', () => {
  it('effect on actor → targetDocument is the actor; item absent from context', () => {
    const actor = mkDoc({ documentName: 'Actor', type: 'character' });
    const effect = mkEffect(actor);
    const change = mkChange({ target: EFFECT_CHANGE_TARGET.ACTOR });

    const result = getEffectContexts(effect, change);

    expect(result.targetDocument).toBe(actor);
    expect(result.contextMap?.actor).toBe(actor);
    expect(result.contextMap?.Actor).toBe(actor);
    expect(result.contextMap?.Owner).toBe(actor);
    expect(result.contextMap?.character).toBe(actor); // keyed by actor.type
    expect(result.contextMap?.item).toBeUndefined();
  });

  it('effect on bare item (no actor parent) + target=ITEM → targetDocument is the item', () => {
    const item = mkDoc({ documentName: 'Item', type: 'weapon' });
    const effect = mkEffect(item);
    const change = mkChange({ target: EFFECT_CHANGE_TARGET.ITEM });

    const result = getEffectContexts(effect, change);

    expect(result.targetDocument).toBe(item);
    expect(result.contextMap?.item).toBe(item);
    expect(result.contextMap?.weapon).toBe(item);
    expect(result.contextMap?.actor).toBeUndefined();
  });

  it('effect on bare item (no actor parent) + target=ACTOR → targetDocument is null', () => {
    const item = mkDoc({ documentName: 'Item', type: 'weapon' });
    const effect = mkEffect(item);
    const change = mkChange({ target: EFFECT_CHANGE_TARGET.ACTOR });

    const result = getEffectContexts(effect, change);

    expect(result.targetDocument).toBeNull();
    expect(result.schemaField).toBeUndefined();
    expect(result.contextMap).toBeUndefined();
  });

  it('effect on item-on-actor + target=ACTOR → returns actor; contextMap carries both', () => {
    const actor = mkDoc({ documentName: 'Actor', type: 'character' });
    const item = mkDoc({ documentName: 'Item', type: 'weapon', parent: actor });
    const effect = mkEffect(item);
    const change = mkChange({ target: EFFECT_CHANGE_TARGET.ACTOR });

    const result = getEffectContexts(effect, change);

    expect(result.targetDocument).toBe(actor);
    expect(result.contextMap?.actor).toBe(actor);
    expect(result.contextMap?.item).toBe(item);
    expect(result.contextMap?.weapon).toBe(item);
    expect(result.contextMap?.character).toBe(actor);
  });

  it('effect on item-on-actor + target=ITEM → returns item; both contexts still populated', () => {
    const actor = mkDoc({ documentName: 'Actor', type: 'character' });
    const item = mkDoc({ documentName: 'Item', type: 'weapon', parent: actor });
    const effect = mkEffect(item);
    const change = mkChange({ target: EFFECT_CHANGE_TARGET.ITEM });

    const result = getEffectContexts(effect, change);

    expect(result.targetDocument).toBe(item);
    expect(result.contextMap?.item).toBe(item);
    expect(result.contextMap?.actor).toBe(actor);
  });

  it('change.key starting with "system." → schemaField resolved via _getField', () => {
    const numField = new NumberField({});
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { 'attributes.str': numField },
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'system.attributes.str' });

    const result = getEffectContexts(effect, change);

    expect(result.schemaField).toBe(numField);
  });

  it('change.key without "system." prefix → schemaField is undefined', () => {
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { 'attributes.str': new NumberField({}) },
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'name' }); // not a system path

    const result = getEffectContexts(effect, change);

    expect(result.schemaField).toBeUndefined();
    expect(result.targetDocument).toBe(actor);
  });
});

// =========================================================================
// resolveActiveEffectChangeValue
// =========================================================================
describe('resolveActiveEffectChangeValue', () => {
  it('non-string change.value → passthrough (no coercion attempted)', () => {
    const actor = mkDoc({ documentName: 'Actor', type: 'character' });
    const effect = mkEffect(actor);
    const change = mkChange({ value: 42 });

    expect(resolveActiveEffectChangeValue(effect, change)).toBe(42);
  });

  it('no contextMap (orphan effect) → returns raw value untouched', () => {
    const item = mkDoc({ documentName: 'Item', type: 'weapon' });
    const effect = mkEffect(item);
    // target=ACTOR on a bare item produces null targetDocument and no contextMap
    const change = mkChange({ target: EFFECT_CHANGE_TARGET.ACTOR, value: '5' });

    expect(resolveActiveEffectChangeValue(effect, change)).toBe('5');
  });

  it('NumberField + numeric string → returns Number(value)', () => {
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { 'attributes.str': new NumberField({}) },
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'system.attributes.str', value: '5' });

    expect(resolveActiveEffectChangeValue(effect, change)).toBe(5);
  });

  it('NumberField + formula → delegates to Roll.safeEval', () => {
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { 'attributes.str': new NumberField({}) },
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'system.attributes.str', value: '2+3' });

    // Setup-mts Roll.safeEval returns Number(expr) || 0. "2+3" → NaN → 0.
    // Override per-test so we exercise the real branch path.
    const safeEval = (globalThis as any).Roll.safeEval as ReturnType<typeof vi.fn>;
    safeEval.mockReturnValueOnce(5);

    expect(resolveActiveEffectChangeValue(effect, change)).toBe(5);
    expect(safeEval).toHaveBeenCalledWith('2+3');
  });

  it('NumberField + un-evaluable garbage → falls back to raw value', () => {
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { 'attributes.str': new NumberField({}) },
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'system.attributes.str', value: 'not-a-number' });

    const safeEval = (globalThis as any).Roll.safeEval as ReturnType<typeof vi.fn>;
    safeEval.mockImplementationOnce(() => {
      throw new Error('parse error');
    });

    expect(resolveActiveEffectChangeValue(effect, change)).toBe('not-a-number');
  });

  it('BooleanField + "true" → true', () => {
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { 'flags.brave': new BooleanField({}) },
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'system.flags.brave', value: 'true' });

    expect(resolveActiveEffectChangeValue(effect, change)).toBe(true);
  });

  it('BooleanField + "false" → false', () => {
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { 'flags.brave': new BooleanField({}) },
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'system.flags.brave', value: 'false' });

    expect(resolveActiveEffectChangeValue(effect, change)).toBe(false);
  });

  it('BooleanField + non-boolean string → returns resolved string (no coercion)', () => {
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { 'flags.brave': new BooleanField({}) },
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'system.flags.brave', value: 'maybe' });

    // Mock returns formula string unchanged, so we get the resolved "maybe" back.
    expect(resolveActiveEffectChangeValue(effect, change)).toBe('maybe');
  });

  it('StringField + arbitrary string → returns resolved string from FormulaData', () => {
    const actor = mkDoc({
      documentName: 'Actor',
      type: 'character',
      systemFields: { 'description.short': new StringField({}) },
    });
    const effect = mkEffect(actor);
    const change = mkChange({ key: 'system.description.short', value: 'hello' });

    expect(resolveActiveEffectChangeValue(effect, change)).toBe('hello');
  });
});
