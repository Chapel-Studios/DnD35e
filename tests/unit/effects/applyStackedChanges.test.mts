import { BONUS_TYPE_MATERIAL } from '@constants/bonusTypes.mjs';
import { EFFECT_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
import type {
  ResolvedEffectChange,
  StackableChangeTarget,
} from '@effects/baseActiveEffect/logic/applyStackedChanges.mjs';
import { applyStackedActiveEffectChanges } from '@effects/baseActiveEffect/logic/applyStackedChanges.mjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests for `applyStackedActiveEffectChanges` (src/documents/activeEffects/baseActiveEffect/logic/applyStackedChanges.mts).
 *
 * This is the shared engine behind both `ActorDnd35e.applyActiveEffects()` and
 * `ItemDnd35e.applyActiveEffects()` — it resolves bonus-type stacking (delegated to
 * `@helpers/stacking.mjs`, already covered by stacking-engine.test.mts) and then
 * applies winners while recording `Override` history (both winners and stacking
 * losers) onto `document.effectOverrides`.
 *
 * `foundry.documents.ActiveEffect` (the real mock class from tests/setup.mts, kept as a
 * class rather than replaced with a plain object) is given fresh `CHANGE_TYPES`, a
 * no-op `_shimChanges`, and a shared `applyChange` spy per test - matching the real
 * pipeline, which always calls `ActiveEffect.applyChange` directly (no per-effect
 * `constructor` dispatch; see `applyStackedChanges.mts`'s doc comment on that call).
 * `change.effect` must remain a real `instanceof ActiveEffect` (or `ItemDnd35e`)
 * document since the source under test now branches on `instanceof ActiveEffect`.
 */

function mkTarget (): StackableChangeTarget {
  return {
    effectOverrides: {},
    getRollData: vi.fn(() => ({})),
  };
}

/** Number of times the shared `ActiveEffect.applyChange` spy was called for this exact change (by reference). */
function timesApplied (change: ResolvedEffectChange): number {
  const spy = (globalThis as any).foundry.documents.ActiveEffect.applyChange as ReturnType<typeof vi.fn>;
  return spy.mock.calls.filter((call: unknown[]) => call[1] === change).length;
}

/** Builds a fake resolved effect change with a real `instanceof ActiveEffect` `effect`. */
function mkChange (opts: {
  key: string;
  value: number;
  type?: string;
  bonusType?: string;
  label?: string;
}): ResolvedEffectChange {
  const ActiveEffectClass = (globalThis as any).foundry.documents.ActiveEffect;
  const effect = new ActiveEffectClass();
  effect.id = `effect-${opts.label ?? opts.key}`;
  effect.name = opts.label ?? 'Test Effect';
  effect.system = { label: opts.label ?? 'Test Effect' };
  return {
    key: opts.key,
    value: opts.value,
    type: opts.type ?? EFFECT_CHANGE_TYPE.ADD,
    bonusType: opts.bonusType,
    label: opts.label,
    effect,
  } as unknown as ResolvedEffectChange;
}

beforeEach(() => {
  const ActiveEffectClass = (globalThis as any).foundry.documents.ActiveEffect;
  ActiveEffectClass._shimChanges = vi.fn();
  ActiveEffectClass.CHANGE_TYPES = {
    [EFFECT_CHANGE_TYPE.ADD]: {},
    [EFFECT_CHANGE_TYPE.OVERRIDE]: {},
  };
  ActiveEffectClass.applyChange = vi.fn((_doc: unknown, change: { key: string; value: unknown }) => ({ [change.key]: change.value }));
});

describe('applyStackedActiveEffectChanges', () => {
  it('calls ActiveEffect._shimChanges once for backwards compatibility', () => {
    const document = mkTarget();
    const change = mkChange({ key: 'system.foo', value: 5 });
    applyStackedActiveEffectChanges(document, [change]);
    expect((globalThis as any).foundry.documents.ActiveEffect._shimChanges).toHaveBeenCalledTimes(1);
  });

  it('applies a single non-stackable (untyped/no bonusType) change and records it without a stackResult', () => {
    const document = mkTarget();
    const change = mkChange({ key: 'system.foo', value: 5, label: 'Untyped Bonus' });
    applyStackedActiveEffectChanges(document, [change]);

    expect(timesApplied(change)).toBe(1);
    expect(document.effectOverrides['system.foo']).toEqual([
      expect.objectContaining({
        fieldPath: 'system.foo',
        value: 5,
        effectName: 'Untyped Bonus',
        stackResult: undefined,
      }),
    ]);
  });

  it('applies every non-stackable change even when several target the same field', () => {
    const document = mkTarget();
    const changeA = mkChange({ key: 'system.foo', value: 5, label: 'Effect A' });
    const changeB = mkChange({ key: 'system.foo', value: 3, label: 'Effect B' });
    applyStackedActiveEffectChanges(document, [changeA, changeB]);

    expect(timesApplied(changeA)).toBe(1);
    expect(timesApplied(changeB)).toBe(1);
    expect(document.effectOverrides['system.foo']).toHaveLength(2);
  });

  it('applies only the best bonus of a named (non-stacking) bonus type and records the loser as ignored', () => {
    const document = mkTarget();
    const weaker = mkChange({ key: 'system.foo', value: 2, bonusType: BONUS_TYPE_MATERIAL, label: 'Iron' });
    const stronger = mkChange({ key: 'system.foo', value: 5, bonusType: BONUS_TYPE_MATERIAL, label: 'Steel' });
    applyStackedActiveEffectChanges(document, [weaker, stronger]);

    expect(timesApplied(weaker)).toBe(0);
    expect(timesApplied(stronger)).toBe(1);

    const entries = document.effectOverrides['system.foo'];
    expect(entries).toEqual([
      expect.objectContaining({ effectName: 'Iron', value: 2, stackResult: 'ignored' }),
      expect.objectContaining({ effectName: 'Steel', value: 5, stackResult: 'applied' }),
    ]);
  });

  it('applies both the best bonus and worst penalty of the same named bonus type', () => {
    const document = mkTarget();
    const bonus = mkChange({ key: 'system.foo', value: 4, bonusType: BONUS_TYPE_MATERIAL, label: 'Bonus Source' });
    const penalty = mkChange({ key: 'system.foo', value: -2, bonusType: BONUS_TYPE_MATERIAL, label: 'Penalty Source' });
    applyStackedActiveEffectChanges(document, [bonus, penalty]);

    expect(timesApplied(bonus)).toBe(1);
    expect(timesApplied(penalty)).toBe(1);

    const entries = document.effectOverrides['system.foo'];
    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ effectName: 'Bonus Source', value: 4, stackResult: 'applied' }),
      expect.objectContaining({ effectName: 'Penalty Source', value: -2, stackResult: 'applied' }),
    ]));
  });

  it('appends to existing effectOverrides history rather than replacing it', () => {
    const document = mkTarget();
    document.effectOverrides['system.foo'] = [{
      fieldPath: 'system.foo',
      value: 1,
      effectName: 'Prior Effect',
      type: EFFECT_CHANGE_TYPE.ADD,
    }];
    const change = mkChange({ key: 'system.foo', value: 5, label: 'New Effect' });
    applyStackedActiveEffectChanges(document, [change]);

    expect(document.effectOverrides['system.foo']).toHaveLength(2);
    expect(document.effectOverrides['system.foo'][0].effectName).toBe('Prior Effect');
    expect(document.effectOverrides['system.foo'][1].effectName).toBe('New Effect');
  });

  it('uses CHANGE_TYPES[type].handler when present instead of ActiveEffect.applyChange', () => {
    const document = mkTarget();
    const handler = vi.fn(() => ({ 'system.foo': 5 }));
    (globalThis as any).foundry.documents.ActiveEffect.CHANGE_TYPES[EFFECT_CHANGE_TYPE.ADD] = { handler };
    const change = mkChange({ key: 'system.foo', value: 5, label: 'Handled Effect' });

    applyStackedActiveEffectChanges(document, [change]);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(timesApplied(change)).toBe(0);
    expect(document.effectOverrides['system.foo']).toHaveLength(1);
  });

  it('handles an empty changes array without error', () => {
    const document = mkTarget();
    expect(() => applyStackedActiveEffectChanges(document, [])).not.toThrow();
    expect(document.effectOverrides).toEqual({});
  });
});
