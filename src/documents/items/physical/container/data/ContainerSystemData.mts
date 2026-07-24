import type { CurrencyData } from '@fields/index.mjs';
import type { PhysicalItemSystemData } from '@items/physical/physicalItem/index.mjs';
import type { PriceSource } from '@settings/index.mjs';

interface ContainerSystemSource {
  maxContentWeight: number | null;
  /** When true, contents weigh nothing for the carrier (e.g. bag of holding). */
  contentsAreWeightless: boolean;
  /** The currency contained within the container. */
  containedCurrency: PriceSource;
}

interface ContainerSystemData extends Omit<ContainerSystemSource, 'containedCurrency'>, PhysicalItemSystemData {
  /** Derived: summed effective weight of contained items. Never stored. */
  contentsWeight: number;
  /** Derived: summed quantity of contained items. Never stored. */
  contentsCount: number;
  /** Derived: true when contentsWeight exceeds maxContentWeight. Never stored. */
  isOverCapacity: boolean;
  /** Derived: total value of contained items. Never stored. */
  contentsValue: CurrencyData;
  /** Instantiated: the currency data model for the currency contained within the container. */
  containedCurrency: CurrencyData;
}

export type {
  ContainerSystemData,
  ContainerSystemSource,
};
