import { EFFECT_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
import { applyStackedActiveEffectChanges, type ResolvedEffectChange } from '@effects/baseActiveEffect/logic/applyStackedChanges.mjs';
import { expandChangeTargetGroups } from '@helpers/formulae/changeTargetGroups.mjs';
import type { Override } from '@helpers/stacking.mjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression tests for poc §7.7's Group Change Target expansion (`expandChangeTargetGroups`,
 * `src/helpers/formulae/changeTargetGroups.mts`) wired into `ActorDnd35e.applyActiveEffects()`
 * between the priority sort and the shared stacking call. An AE change whose `key` is a
 * registered group (e.g. "group:allSaves") must expand into one independent stacking
 * candidate per concrete field path (`system.saves.fort`/`.reflex`/`.will`).
 *
 * Exercised here directly against `expandChangeTargetGroups` + the real
 * `applyStackedActiveEffectChanges` shared engine — not through a live `ActorDnd35e`
 * instance — since importing the real class pulls in the full actor/Creature module
 * graph (unrelated circular-import ordering concerns) for no additional coverage:
 * `expandChangeTargetGroups` only needs an actor-shaped value to pass through to a
 * group's `expand()`, and the POC `allSaves` group's `expand()` doesn't even read it.
 */

function mkChange (opts: {
  key: string;
  value: number;
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
    type: EFFECT_CHANGE_TYPE.ADD,
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
  };
  ActiveEffectClass.applyChange = vi.fn((_doc: unknown, change: { key: string; value: unknown }) => ({ [change.key]: change.value }));
});

describe('expandChangeTargetGroups', () => {
  it('expands a registered group key into one clone per concrete field path', () => {
    const change = mkChange({ key: 'group:allSaves', value: 2 });
    const expanded = expandChangeTargetGroups([change], {} as any);

    expect(expanded.map(c => c.key).sort()).toEqual([
      'system.saves.fort',
      'system.saves.reflex',
      'system.saves.will',
    ]);
    // Every other property is preserved on each clone.
    for (const c of expanded) expect(c.value).toBe(2);
  });

  it('leaves a non-group key unchanged (single-element passthrough)', () => {
    const change = mkChange({ key: 'system.hp.max', value: 5 });
    const expanded = expandChangeTargetGroups([change], {} as any);
    expect(expanded).toEqual([change]);
  });

  it('passes through changes with no key untouched', () => {
    const change = { value: 5 } as unknown as ResolvedEffectChange;
    const expanded = expandChangeTargetGroups([change], {} as any);
    expect(expanded).toEqual([change]);
  });
});

describe('expandChangeTargetGroups → applyStackedActiveEffectChanges integration', () => {
  it('each field expanded from a group stacks independently by bonus type', () => {
    const document = { effectOverrides: {} as Record<string, Override[]>, getRollData: vi.fn(() => ({})) };
    const groupChange = mkChange({ key: 'group:allSaves', value: 2, bonusType: 'resistance', label: 'Cloak of Resistance +2' });
    const fortOverride = mkChange({ key: 'system.saves.fort', value: 4, bonusType: 'resistance', label: 'Cloak of Resistance +4' });

    const expanded = expandChangeTargetGroups([groupChange, fortOverride], {} as any);
    applyStackedActiveEffectChanges(document, expanded);

    // Fort: two competing resistance bonuses on the same field — only the higher (+4) applies.
    expect(document.effectOverrides['system.saves.fort']).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: 2, stackResult: 'ignored' }),
      expect.objectContaining({ value: 4, stackResult: 'applied' }),
    ]));
    // Reflex/Will only got the group-sourced +2, no competition — applies alone.
    expect(document.effectOverrides['system.saves.reflex']).toEqual([
      expect.objectContaining({ value: 2, stackResult: 'applied' }),
    ]);
    expect(document.effectOverrides['system.saves.will']).toEqual([
      expect.objectContaining({ value: 2, stackResult: 'applied' }),
    ]);
  });
});
