/**
 * DataModel representing a price composed of coin stacks.
 *
 * When used with {@link CurrencyField} (an EmbeddedDataField), the prepared value
 * is a CurrencyData instance with helper methods like {@link consolidate} and
 * {@link totalValueInGp}.
 *
 * Source shape: `{ stacks: Array<{ coinId: string, count: number }>, srdEquivalent: number }`
 *
 * The `srdEquivalent` field is automatically recomputed from stacks using the
 * current currency settings every time the source is initialised (i.e. on save).
 * It acts as a snapshot so the GP value is still available if settings change.
 */

import { CURRENCY_KEY, DEFAULT_CURRENCY_CONFIG } from '@settings/currency/constants.mjs';
import type { CoinageDefinition, CoinStack, CurrencyConfig, PriceSource } from '@settings/currency/types.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

const { DataModel } = foundry.abstract;
const { ArrayField, SchemaField, StringField, NumberField } = foundry.data.fields;

class CurrencyData extends DataModel {
  static override defineSchema() {
    return {
      stacks: new ArrayField(
        new SchemaField({
          coinId: new StringField({ required: true, blank: false }),
          count: new NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        }),
        { initial: [] }
      ),
      srdEquivalent: new NumberField<number, number, true, false, true>({ required: true, nullable: false, initial: 0 }),
    };
  }

  /**
   * Keeps {@link srdEquivalent} in sync with stacks and handles world-loading
   * with stale currency settings.
   *
   * - If every stack references an **enabled** coin in this world, recompute
   *   `srdEquivalent` from the stacks (normal case — keeps the snapshot fresh).
   * - If **any** stack references a disabled or unknown coin, the stacks are
   *   stale.  Use the previously-stored `srdEquivalent` as the total GP value
   *   and reconsolidate into denominations the current world supports.
   */
  override _initializeSource(
    data: object,
    options?: any
  ) {
    const source = super._initializeSource(data, options);
    const stacks = ((source as any).stacks ?? []) as CoinStack[];
    const enabledCoinages = CurrencyData.getEnabledCoinages();
    const enabledIds = new Set(enabledCoinages.map(c => c.id));

    const allValid = stacks.length === 0 || stacks.every(s => enabledIds.has(s.coinId));

    if (allValid) {
      // Normal path — recompute srdEquivalent from current stacks
      (source as any).srdEquivalent = CurrencyData.computeGpValue(stacks);
    } else {
      // Stale stacks — reconsolidate using the stored srdEquivalent
      const storedGp = (source as any).srdEquivalent ?? CurrencyData.computeGpValue(stacks);
      (source as any).stacks = CurrencyData.consolidateFromGp(storedGp);
      (source as any).srdEquivalent = storedGp;
    }

    return source;
  }

  // ─── Currency Config Access ─────────────────────────────────────────────────

  /** Retrieve the world's currency configuration from settings. */
  static getCurrencyConfig(): CurrencyConfig {
    try {
      return (game.settings.get(SYSTEM_ID, CURRENCY_KEY) as CurrencyConfig) ?? DEFAULT_CURRENCY_CONFIG;
    } catch {
      return DEFAULT_CURRENCY_CONFIG;
    }
  }

  /** All enabled coinages in the world. */
  static getEnabledCoinages(): CoinageDefinition[] {
    return this.getCurrencyConfig().coinages.filter(c => c.enabled);
  }

  // ─── Computed Properties ────────────────────────────────────────────────────

  /** Total value of this price expressed in gold pieces (live, from current settings). */
  get totalValueInGp(): number {
    return CurrencyData.computeGpValue(this.stacks);
  }

  // ─── Static Value Helpers ───────────────────────────────────────────────────

  /**
   * Compute the total GP value of a set of coin stacks using the current
   * currency settings.  Used both for the live getter and the persisted
   * {@link srdEquivalent} snapshot.
   */
  static computeGpValue(stacks: CoinStack[]): number {
    const coinages = CurrencyData.getEnabledCoinages();
    let total = 0;
    for (const stack of stacks) {
      const coin = coinages.find(c => c.id === stack.coinId);
      if (coin) total += stack.count * coin.valueInGp;
    }
    return total;
  }

  /** Whether this price has no coin stacks. */
  get isEmpty(): boolean {
    return this.stacks.length === 0;
  }

  // ─── Manipulation Methods ───────────────────────────────────────────────────

  /**
   * Consolidate into the fewest coins possible, targeting the
   * `rollUpTargetCoin` from the world's currency settings.
   *
   * Uses the persisted {@link srdEquivalent} as the total GP value rather than
   * recalculating from stacks, so the result is safe even if coins have been
   * reconfigured since the price was last saved.
   *
   * Coins marked {@link CoinageDefinition.excludeFromRollUp | excludeFromRollUp}
   * are not used as output denominations.
   *
   * Does **not** mutate this instance — returns a new stacks array suitable
   * for passing to a field updater or `updateSource`.
   */
  consolidate(): CoinStack[] {
    return CurrencyData.consolidateFromGp(this.srdEquivalent);
  }

  /**
   * Build a consolidated stacks array from a raw GP total using the current
   * world currency settings.  Shared by {@link consolidate} and the stale-stack
   * recovery path in {@link _initializeSource}.
   */
  static consolidateFromGp(totalGp: number): CoinStack[] {
    if (totalGp <= 0) return [];

    const config = CurrencyData.getCurrencyConfig();
    const enabledCoinages = config.coinages.filter(c => c.enabled);
    const targetCoinId = config.rollUpTargetCoin;
    const targetCoin = enabledCoinages.find(c => c.id === targetCoinId);

    // Only non-excluded coins are eligible as output denominations
    const outputCoins = [...enabledCoinages]
      .filter(c => !c.excludeFromRollUp)
      .sort((a, b) => b.valueInGp - a.valueInGp);

    const newStacks: CoinStack[] = [];
    let remainingGp = totalGp;

    for (const coin of outputCoins) {
      if (!targetCoin) continue;
      if (coin.valueInGp > targetCoin.valueInGp) continue;

      const count = Math.floor(remainingGp / coin.valueInGp);
      if (count > 0) {
        newStacks.push({ coinId: coin.id, count });
        remainingGp -= count * coin.valueInGp;
      }
      if (remainingGp <= 0) break;
    }

    // Handle remainder that couldn't be expressed cleanly
    if (remainingGp > 0.0001) {
      const smallestCoin = outputCoins[outputCoins.length - 1];
      if (smallestCoin) {
        const count = Math.round(remainingGp / smallestCoin.valueInGp);
        if (count > 0) {
          const existing = newStacks.find(s => s.coinId === smallestCoin.id);
          if (existing) existing.count += count;
          else newStacks.push({ coinId: smallestCoin.id, count });
        }
      }
    }

    return newStacks
      .filter(s => s.count > 0)
      .sort((a, b) => {
        const coinA = enabledCoinages.find(c => c.id === a.coinId);
        const coinB = enabledCoinages.find(c => c.id === b.coinId);
        return (coinB?.valueInGp ?? 0) - (coinA?.valueInGp ?? 0);
      });
  }

  // ─── Static Helpers ─────────────────────────────────────────────────────────

  /**
   * Build a complete {@link PriceSource} from stacks, pre-computing
   * `srdEquivalent`.  Use this when passing data to a field updater so
   * the GP snapshot is always written to the database.
   *
   * `_initializeSource` will verify / correct the value on the next load.
   */
  static toSource(stacks: CoinStack[]): PriceSource {
    return { stacks, srdEquivalent: CurrencyData.computeGpValue(stacks) };
  }

  toSource(): PriceSource {
    return CurrencyData.toSource(this.stacks);
  }

  /**
   * Merge two sets of stacks by coinId, summing counts.
   * Returns a new array — does not mutate inputs.
   */
  static mergeStacks(a: CoinStack[], b: CoinStack[]): CoinStack[] {
    const map = new Map<string, number>();
    for (const s of a) map.set(s.coinId, (map.get(s.coinId) ?? 0) + s.count);
    for (const s of b) map.set(s.coinId, (map.get(s.coinId) ?? 0) + s.count);
    return Array.from(map.entries())
      .filter(([, count]) => count > 0)
      .map(([coinId, count]) => ({ coinId, count }));
  }

  /**
   * Convert a stacks array into a Map<coinId, count> for easy manipulation.
   */
  static toMap(stacks: CoinStack[]): Map<string, number> {
    return new Map(stacks.map(s => [s.coinId, s.count]));
  }

  /**
   * Convert a Map<coinId, count> back into a stacks array.
   * Filters out entries with count <= 0.
   */
  static fromMap(map: Map<string, number>): CoinStack[] {
    return Array.from(map.entries())
      .filter(([, count]) => count > 0)
      .map(([coinId, count]) => ({ coinId, count }));
  }

  override toString(): string {
    const coinages = CurrencyData.getEnabledCoinages();
    return this.stacks.length === 0
      ? '0'
      : this.stacks
        .map(s => {
          const coin = coinages.find(c => c.id === s.coinId);
          return `${s.count} ${coin?.shortLabel ?? s.coinId}`;
        })
        .join(', ');
  }
}

interface CurrencyData {
  stacks: CoinStack[];
  srdEquivalent: number;
}

export { CurrencyData };

