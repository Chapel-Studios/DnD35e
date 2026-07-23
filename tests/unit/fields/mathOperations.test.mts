import type { CoinStack } from '@settings/currency/types.mjs';
import { describe, expect, it, vi } from 'vitest';

/**
 * Unit tests for `addCurrency`/`multiplyCurrency` (src/fields/currency/logic/mathOperations.mts).
 *
 * `CurrencyData.fromStacks` is mocked to a passthrough stub (`{ stacks }`) rather than
 * constructed for real: `CurrencyData` is a Foundry `DataModel` whose `_initializeSource`
 * override reads world currency settings via `game.settings.get` — real construction
 * belongs in E2E. This keeps the test focused on the merge/scale/filter logic itself.
 */

vi.mock('@fields/currency/CurrencyData.mjs', () => {
  return {
    CurrencyData: {
      fromStacks: vi.fn((stacks: CoinStack[]) => ({ stacks })),
    },
  };
});

const { addCurrency, multiplyCurrency } = await import('@fields/currency/logic/mathOperations.mjs');

function mkValue (stacks: CoinStack[]): { stacks: CoinStack[] } {
  return { stacks } as unknown as { stacks: CoinStack[] };
}

describe('multiplyCurrency', () => {
  it('scales every stack count by the factor', () => {
    const result = multiplyCurrency(mkValue([{ coinId: 'gp', count: 10 }]) as any, 3);
    expect(result).toEqual({ stacks: [{ coinId: 'gp', count: 30 }] });
  });

  it('rounds fractional results', () => {
    const result = multiplyCurrency(mkValue([{ coinId: 'gp', count: 5 }]) as any, 0.5) as any;
    expect(result.stacks).toEqual([{ coinId: 'gp', count: 3 }]); // Math.round(2.5) === 3
  });

  it('drops stacks that round down to zero or negative', () => {
    const result = multiplyCurrency(mkValue([
      { coinId: 'gp', count: 1 },
      { coinId: 'sp', count: 10 },
    ]) as any, 0) as any;
    expect(result.stacks).toEqual([]);
  });

  it('handles an empty stacks array', () => {
    const result = multiplyCurrency(mkValue([]) as any, 5) as any;
    expect(result.stacks).toEqual([]);
  });
});

describe('addCurrency', () => {
  it('sums counts for matching coinIds', () => {
    const result = addCurrency(
      mkValue([{ coinId: 'gp', count: 10 }]) as any,
      mkValue([{ coinId: 'gp', count: 5 }]) as any
    ) as any;
    expect(result.stacks).toEqual([{ coinId: 'gp', count: 15 }]);
  });

  it('keeps distinct coinIds as separate stacks', () => {
    const result = addCurrency(
      mkValue([{ coinId: 'gp', count: 10 }]) as any,
      mkValue([{ coinId: 'sp', count: 5 }]) as any
    ) as any;
    expect(result.stacks).toEqual(expect.arrayContaining([
      { coinId: 'gp', count: 10 },
      { coinId: 'sp', count: 5 },
    ]));
    expect(result.stacks).toHaveLength(2);
  });

  it('does not mutate either input', () => {
    const value1 = mkValue([{ coinId: 'gp', count: 10 }]);
    const value2 = mkValue([{ coinId: 'gp', count: 5 }]);
    addCurrency(value1 as any, value2 as any);
    expect(value1.stacks).toEqual([{ coinId: 'gp', count: 10 }]);
    expect(value2.stacks).toEqual([{ coinId: 'gp', count: 5 }]);
  });

  it('filters out stacks that sum to zero or negative', () => {
    const result = addCurrency(
      mkValue([{ coinId: 'gp', count: 5 }]) as any,
      mkValue([{ coinId: 'gp', count: -5 }]) as any
    ) as any;
    expect(result.stacks).toEqual([]);
  });

  it('handles two empty stacks arrays', () => {
    const result = addCurrency(mkValue([]) as any, mkValue([]) as any) as any;
    expect(result.stacks).toEqual([]);
  });
});
