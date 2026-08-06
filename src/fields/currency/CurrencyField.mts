/**
 * Custom EmbeddedDataField for Price objects.
 *
 * Provides Active Effect change modes that operate on coin stacks by coinId:
 * - **add**: merge coin counts (adds counts for matching coins, appends new)
 * - **subtract**: reduce coin counts (removes stacks that reach 0)
 * - **multiply**: multiply all counts by a scalar factor
 * - **override**: replace entire price
 * - **upgrade**: per-coinId, take the higher count
 * - **downgrade**: per-coinId, take the lower count (only existing coins)
 *
 * Delta casting supports:
 * - JSON: `[{"coinId":"srd_gp","count":5}]` or `{"stacks":[...]}`
 * - Shorthand: `"5 srd_gp, 3 srd_sp"`
 * - Raw CoinStack arrays (from programmatic change building)
 */

import type { CoinStack } from '@settings/currency/types.mjs';

import { CurrencyData } from './CurrencyData.mjs';
import { addCurrency, multiplyCurrency } from './logic/mathOperations.mjs';

const { EmbeddedDataField } = foundry.data.fields;

class CurrencyField extends EmbeddedDataField {
  static isFamiliarLeaf = true;

  constructor(options: Record<string, unknown> = {}) {
    super(CurrencyData, options);
  }

  // ─── Delta Casting ──────────────────────────────────────────────────────────

  /**
   * Cast an AE change value into a CoinStack array (the delta).
   *
   * Accepts:
   * - `CoinStack[]` (passthrough)
   * - `CurrencyData` instance (extracts `.stacks`)
   * - Object with `.stacks` `CoinStack[]` array
   * - JSON string encoding any of the above
   * - Shorthand string: `"5 srd_gp, 3 srd_sp"`
   * - Number: treated as a total gp-equivalent value, consolidated into whatever
   *   denominations express it exactly (e.g. `0.11` → 11 copper, not rounded to 0 gold)
   */
  override _castChangeDelta(raw: unknown, replacementData: Record<string, unknown> = {}): CoinStack[] {
    // Already a stacks array
    if (Array.isArray(raw)) {
      return raw.map((e: any) => ({ coinId: String(e.coinId), count: Number(e.count) }));
    }

    // CurrencyData instance or object with stacks
    if (raw && typeof raw === 'object' && 'stacks' in raw && Array.isArray((raw as any).stacks)) {
      return (raw as any).stacks.map((e: any) => ({ coinId: String(e.coinId), count: Number(e.count) }));
    }

    if (typeof raw === 'number' || !isNaN(Number(raw))) {
      // A bare number is a gp-equivalent total, not a literal `srd_gp` coin count -
      // consolidate so fractional gp values (e.g. 11 copper) aren't rounded away.
      const gpValue = Number(raw);
      const sign = gpValue < 0 ? -1 : 1;
      return CurrencyData.consolidateFromGp(Math.abs(gpValue)).map(s => ({ ...s, count: s.count * sign }));
    }

    // String handling
    if (typeof raw === 'string') {
      const resolved = (this as any)._replaceDataRefs(raw, replacementData) as string;

      // Try JSON
      try {
        const parsed = JSON.parse(resolved);
        if (Array.isArray(parsed)) {
          return parsed.map((e: any) => ({ coinId: String(e.coinId), count: Number(e.count) }));
        }
        if (parsed?.stacks && Array.isArray(parsed.stacks)) {
          return parsed.stacks.map((e: any) => ({ coinId: String(e.coinId), count: Number(e.count) }));
        }
        if (parsed?.coinId !== undefined) {
          return [{ coinId: String(parsed.coinId), count: Number(parsed.count) }];
        }
      } catch {
        // Not JSON — try shorthand
      }

      return CurrencyField.parseShorthand(resolved);
    }

    return [];
  }

  /**
   * Parse a shorthand price string like `"5 srd_gp, 3 srd_sp"` into CoinStack[].
   */
  static parseShorthand(raw: string): CoinStack[] {
    return raw.split(',').reduce<CoinStack[]>((acc, part) => {
      const match = part.trim().match(/^([+-]?\d+)\s+(\S+)$/);
      if (match) acc.push({ coinId: match[2], count: Number(match[1]) });
      return acc;
    }, []);
  }

  // ─── Change Modes ───────────────────────────────────────────────────────────

  /** Wrap stacks in a source object with an up-to-date srdEquivalent. */
  static _withGpValue(stacks: CoinStack[]): { stacks: CoinStack[]; srdEquivalent: number } {
    return { stacks, srdEquivalent: CurrencyData.computeGpValue(stacks) };
  }

  /** Add: merge coin stacks by coinId, summing counts. */
  override _applyChangeAdd(value: CurrencyData, delta: CoinStack[], _model: any, _change: any): { stacks: CoinStack[]; srdEquivalent: number } {
    const newStacks = CurrencyData.fromStacks(delta);
    return addCurrency(value, newStacks);
  }

  /**
   * Subtract: remove the delta's GP value from the current price, then
   * reconstruct stacks that mirror the original denominations as closely as
   * possible — "making change" when a denomination must be broken.
   *
   * Algorithm:
   * 1. Compute GP totals for current stacks and the delta.
   * 2. Walk the existing denominations (highest value first) keeping as many
   *    coins of each as fit within the remaining GP budget.
   * 3. Any leftover fractional GP is expressed in the smallest enabled coin.
   */
  override _applyChangeSubtract(value: CurrencyData, delta: CoinStack[], _model: any, _change: any): { stacks: CoinStack[]; srdEquivalent: number } {
    const currentGp = CurrencyData.computeGpValue(value.stacks);
    const subtractGp = CurrencyData.computeGpValue(delta);
    const remainingGp = currentGp - subtractGp;

    if (remainingGp <= 0) return CurrencyField._withGpValue([]);

    const enabledCoinages = CurrencyData.getEnabledCoinages();
    const coinLookup = new Map(enabledCoinages.map(c => [c.id, c]));

    // Walk existing denominations highest-first, keeping as many as fit
    const sortedExisting = [...value.stacks]
      .filter(s => coinLookup.has(s.coinId))
      .sort((a, b) => coinLookup.get(b.coinId)!.valueInGp - coinLookup.get(a.coinId)!.valueInGp);

    const newStacks: CoinStack[] = [];
    let budget = remainingGp;

    for (const stack of sortedExisting) {
      const coin = coinLookup.get(stack.coinId)!;
      const maxAffordable = Math.floor(budget / coin.valueInGp);
      const keep = Math.min(stack.count, maxAffordable);
      if (keep > 0) {
        newStacks.push({ coinId: stack.coinId, count: keep });
        budget -= keep * coin.valueInGp;
      }
      if (budget <= 0.0001) break;
    }

    // Express any leftover GP as the smallest enabled coin
    if (budget > 0.0001) {
      const smallest = [...enabledCoinages].sort((a, b) => a.valueInGp - b.valueInGp)[0];
      if (smallest) {
        const count = Math.round(budget / smallest.valueInGp);
        if (count > 0) {
          const existing = newStacks.find(s => s.coinId === smallest.id);
          if (existing) existing.count += count;
          else newStacks.push({ coinId: smallest.id, count });
        }
      }
    }

    return CurrencyField._withGpValue(newStacks);
  }

  /**
   * Multiply: scale all coin counts by a numeric factor.
   * Reads the factor from the original `change.value`, not the cast `delta` -
   * a multiply factor is a scalar, not a gp-equivalent currency amount, so it
   * must not be routed through `_castChangeDelta`'s gp-consolidation.
   */
  override _applyChangeMultiply(value: CurrencyData, _delta: CoinStack[], _model: any, change: any): { stacks: CoinStack[]; srdEquivalent: number } {
    const factor = Number(change?.value);
    return multiplyCurrency(value, Number.isFinite(factor) ? factor : 1);
  }

  /** Override: replace the entire price with the delta. */
  override _applyChangeOverride(_value: CurrencyData, delta: CoinStack[], _model: any, _change: any): { stacks: CoinStack[]; srdEquivalent: number } {
    return CurrencyField._withGpValue(delta);
  }

  /** Upgrade: compare total GP value, keep whichever stacks are worth more. */
  override _applyChangeUpgrade(value: CurrencyData, delta: CoinStack[], _model: any, _change: any): { stacks: CoinStack[]; srdEquivalent: number } {
    const currentGp = CurrencyData.computeGpValue(value.stacks);
    const deltaGp = CurrencyData.computeGpValue(delta);
    return CurrencyField._withGpValue(deltaGp > currentGp ? delta : [...value.stacks]);
  }

  /** Downgrade: compare total GP value, keep whichever stacks are worth less. */
  override _applyChangeDowngrade(value: CurrencyData, delta: CoinStack[], _model: any, _change: any): { stacks: CoinStack[]; srdEquivalent: number } {
    const currentGp = CurrencyData.computeGpValue(value.stacks);
    const deltaGp = CurrencyData.computeGpValue(delta);
    return CurrencyField._withGpValue(deltaGp < currentGp ? delta : [...value.stacks]);
  }
}

export { CurrencyField };

