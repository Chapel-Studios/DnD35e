import type {
  ActiveEffectSystemData,
  ActiveEffectSystemSourceDnd35e,
} from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import type { CurrencyData } from '@fields/currency/CurrencyData.mjs';
import type { PriceSource } from '@settings/index.mjs';

/**
 * AE placed on a container bag by each of its contained items.
 * Stores pre-computed weight and quantity contribution so the bag can sum them
 * in prepareDerivedData without polling the items themselves.
 */
interface ContainmentSystemStats {
  /** UUID of the item stowed in this container — the source of this contribution. */
  sourceItemUuid: string | null;
  /** Pre-computed weight contribution: item.weight × item.quantity. */
  contributedWeight: number;
  /** Pre-computed quantity contribution: item.quantity. */
  contributedCount: number;
}

interface ContainmentSystemSource extends ContainmentSystemStats, ActiveEffectSystemSourceDnd35e {
  /** Pre-computed price contribution: item.price × item.quantity. */
  contributedPrice?: PriceSource;
}

interface ContainmentSystemData extends ContainmentSystemStats, ActiveEffectSystemData {
  /** Pre-computed price contribution: item.price × item.quantity. */
  contributedPrice?: CurrencyData;
}

export type {
  ContainmentSystemData,
  ContainmentSystemSource,
  ContainmentSystemStats,
};
