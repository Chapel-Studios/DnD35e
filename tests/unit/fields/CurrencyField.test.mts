import type { CoinStack } from '@settings/currency/types.mjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests for CurrencyField's AE change-mode handling and delta casting
 * (src/fields/currency/CurrencyField.mts). `CurrencyData` is mocked to a
 * lightweight coin-table stub - real construction/game.settings access
 * belongs in E2E (same isolation approach as mathOperations.test.mts).
 *
 * `consolidateFromGp` is stubbed to a simple, traceable cp-conversion rather
 * than reimplementing its real multi-denomination algorithm - these tests
 * cover `_castChangeDelta`'s delegation/sign-handling, not CurrencyData's
 * own consolidation math.
 */

const COIN_VALUES: Record<string, number> = {
  srd_pp: 10,
  srd_gp: 1,
  srd_sp: 0.1,
  srd_cp: 0.01,
};

const ENABLED_COINAGES = [
  { id: 'srd_pp', valueInGp: 10 },
  { id: 'srd_gp', valueInGp: 1 },
  { id: 'srd_sp', valueInGp: 0.1 },
  { id: 'srd_cp', valueInGp: 0.01 },
];

function computeGpValue(stacks: CoinStack[]): number {
  return stacks.reduce((sum, s) => sum + s.count * (COIN_VALUES[s.coinId] ?? 0), 0);
}

const consolidateFromGpMock = vi.fn((totalGp: number) => [{ coinId: 'srd_cp', count: Math.round(totalGp * 100) }]);

vi.mock('@fields/currency/CurrencyData.mjs', () => {
  return {
    CurrencyData: {
      fromStacks: vi.fn((stacks: CoinStack[]) => ({ stacks, srdEquivalent: computeGpValue(stacks) })),
      computeGpValue: vi.fn(computeGpValue),
      getEnabledCoinages: vi.fn(() => ENABLED_COINAGES),
      consolidateFromGp: consolidateFromGpMock,
    },
  };
});

const { CurrencyField } = await import('@fields/currency/CurrencyField.mjs');

function mkValue(stacks: CoinStack[]): any {
  return { stacks };
}

function mkField(): any {
  const field = new CurrencyField() as any;
  // Real DataField._replaceDataRefs isn't present on the unit-test EmbeddedDataField
  // stub (see tests/setup.mts) - stub it as a passthrough since none of these
  // cases exercise `@`-reference resolution.
  field._replaceDataRefs = (raw: string) => raw;
  return field;
}

describe('CurrencyField._castChangeDelta', () => {
  beforeEach(() => {
    consolidateFromGpMock.mockClear();
  });

  it('passes through a CoinStack[] array, coercing count to Number', () => {
    const delta = mkField()._castChangeDelta([{ coinId: 'srd_gp', count: '5' }]);
    expect(delta).toEqual([{ coinId: 'srd_gp', count: 5 }]);
  });

  it('extracts stacks from a CurrencyData-shaped object', () => {
    const delta = mkField()._castChangeDelta({ stacks: [{ coinId: 'srd_sp', count: 3 }] });
    expect(delta).toEqual([{ coinId: 'srd_sp', count: 3 }]);
  });

  it('parses a JSON array string', () => {
    const delta = mkField()._castChangeDelta('[{"coinId":"srd_gp","count":2}]');
    expect(delta).toEqual([{ coinId: 'srd_gp', count: 2 }]);
  });

  it('parses a JSON stacks-object string', () => {
    const delta = mkField()._castChangeDelta('{"stacks":[{"coinId":"srd_cp","count":9}]}');
    expect(delta).toEqual([{ coinId: 'srd_cp', count: 9 }]);
  });

  it('parses a JSON single-coin string', () => {
    const delta = mkField()._castChangeDelta('{"coinId":"srd_pp","count":1}');
    expect(delta).toEqual([{ coinId: 'srd_pp', count: 1 }]);
  });

  it('parses shorthand strings', () => {
    const delta = mkField()._castChangeDelta('5 srd_gp, 3 srd_sp');
    expect(delta).toEqual([{ coinId: 'srd_gp', count: 5 }, { coinId: 'srd_sp', count: 3 }]);
  });

  it('treats a positive number as a gp-equivalent total, delegating to CurrencyData.consolidateFromGp', () => {
    // 11 x 1cp = 0.11gp - regression coverage for truncating fractional gp to 0.
    const delta = mkField()._castChangeDelta(0.11);
    expect(consolidateFromGpMock).toHaveBeenCalledWith(0.11);
    expect(delta).toEqual([{ coinId: 'srd_cp', count: 11 }]);
  });

  it('negates the consolidated result for a negative number', () => {
    const delta = mkField()._castChangeDelta(-0.11);
    expect(consolidateFromGpMock).toHaveBeenCalledWith(0.11);
    expect(delta).toEqual([{ coinId: 'srd_cp', count: -11 }]);
  });

  it('treats a numeric string the same as a number', () => {
    const delta = mkField()._castChangeDelta('2');
    expect(consolidateFromGpMock).toHaveBeenCalledWith(2);
    expect(delta).toEqual([{ coinId: 'srd_cp', count: 200 }]);
  });

  it('returns an empty array for unparseable strings', () => {
    const delta = mkField()._castChangeDelta('not a valid price');
    expect(delta).toEqual([]);
  });
});

describe('CurrencyField change modes', () => {
  it('_applyChangeAdd merges matching coinIds and sums counts', () => {
    const result = mkField()._applyChangeAdd(
      mkValue([{ coinId: 'srd_gp', count: 10 }]),
      [{ coinId: 'srd_gp', count: 5 }]
    );
    expect(result.stacks).toEqual([{ coinId: 'srd_gp', count: 15 }]);
  });

  describe('_applyChangeSubtract', () => {
    it('keeps existing denominations when they fully cover the subtraction', () => {
      const result = mkField()._applyChangeSubtract(
        mkValue([{ coinId: 'srd_gp', count: 10 }]),
        [{ coinId: 'srd_gp', count: 3 }]
      );
      expect(result.stacks).toEqual([{ coinId: 'srd_gp', count: 7 }]);
    });

    it('breaks a higher denomination into the smallest enabled coin for the remainder', () => {
      // 1gp on hand, subtract 0.5gp - no gp is affordable from a 0.5gp budget,
      // so the remainder is expressed in the smallest enabled coin (copper).
      const result = mkField()._applyChangeSubtract(
        mkValue([{ coinId: 'srd_gp', count: 1 }]),
        [{ coinId: 'srd_sp', count: 5 }]
      );
      expect(result.stacks).toEqual([{ coinId: 'srd_cp', count: 50 }]);
    });

    it('returns no stacks when the subtraction meets or exceeds the current value', () => {
      const result = mkField()._applyChangeSubtract(
        mkValue([{ coinId: 'srd_gp', count: 5 }]),
        [{ coinId: 'srd_gp', count: 5 }]
      );
      expect(result.stacks).toEqual([]);
    });
  });

  describe('_applyChangeMultiply', () => {
    it('reads the factor from change.value, not the cast delta', () => {
      // If the factor were (mis)read from a gp-consolidated `delta`, a fractional
      // factor like 0.5 would be reinterpreted as "0.5gp worth of coins" instead
      // of "half". Passing a populated, irrelevant `delta` here proves it's ignored.
      const irrelevantDelta = mkField()._castChangeDelta(0.5);
      const result = mkField()._applyChangeMultiply(
        mkValue([{ coinId: 'srd_gp', count: 10 }]),
        irrelevantDelta,
        undefined,
        { value: 0.5 }
      );
      expect(result.stacks).toEqual([{ coinId: 'srd_gp', count: 5 }]);
    });

    it('supports whole-number factors (doubling every denomination)', () => {
      const result = mkField()._applyChangeMultiply(
        mkValue([{ coinId: 'srd_gp', count: 10 }, { coinId: 'srd_sp', count: 4 }]),
        [],
        undefined,
        { value: 2 }
      );
      expect(result.stacks).toEqual([{ coinId: 'srd_gp', count: 20 }, { coinId: 'srd_sp', count: 8 }]);
    });

    it('falls back to a no-op factor of 1 when change.value is not numeric', () => {
      const result = mkField()._applyChangeMultiply(
        mkValue([{ coinId: 'srd_gp', count: 10 }]),
        [],
        undefined,
        { value: 'not a number' }
      );
      expect(result.stacks).toEqual([{ coinId: 'srd_gp', count: 10 }]);
    });
  });

  it('_applyChangeOverride replaces stacks entirely', () => {
    const result = mkField()._applyChangeOverride(
      mkValue([{ coinId: 'srd_gp', count: 99 }]),
      [{ coinId: 'srd_sp', count: 3 }]
    );
    expect(result.stacks).toEqual([{ coinId: 'srd_sp', count: 3 }]);
  });

  describe('_applyChangeUpgrade', () => {
    it('keeps the delta when it is worth more', () => {
      const value = mkValue([{ coinId: 'srd_sp', count: 5 }]); // 0.5gp
      const delta = [{ coinId: 'srd_gp', count: 1 }]; // 1gp
      const result = mkField()._applyChangeUpgrade(value, delta);
      expect(result.stacks).toEqual(delta);
    });

    it('keeps the current value when it is worth more', () => {
      const value = mkValue([{ coinId: 'srd_gp', count: 5 }]); // 5gp
      const delta = [{ coinId: 'srd_sp', count: 1 }]; // 0.1gp
      const result = mkField()._applyChangeUpgrade(value, delta);
      expect(result.stacks).toEqual(value.stacks);
    });
  });

  it('_applyChangeDowngrade keeps whichever is worth less', () => {
    const value = mkValue([{ coinId: 'srd_gp', count: 5 }]); // 5gp
    const delta = [{ coinId: 'srd_sp', count: 1 }]; // 0.1gp
    const result = mkField()._applyChangeDowngrade(value, delta);
    expect(result.stacks).toEqual(delta);
  });
});

describe('CurrencyField.parseShorthand', () => {
  it('parses multiple comma-separated coin amounts, including negatives', () => {
    const stacks = CurrencyField.parseShorthand('5 srd_gp, -3 srd_sp, 10 srd_cp');
    expect(stacks).toEqual([
      { coinId: 'srd_gp', count: 5 },
      { coinId: 'srd_sp', count: -3 },
      { coinId: 'srd_cp', count: 10 },
    ]);
  });

  it('ignores parts that do not match the "<count> <coinId>" shape', () => {
    const stacks = CurrencyField.parseShorthand('5 srd_gp, garbage');
    expect(stacks).toEqual([{ coinId: 'srd_gp', count: 5 }]);
  });
});
