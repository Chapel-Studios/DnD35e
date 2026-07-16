import type { PhysicalItemSystemData } from '@items/physical/physicalItem/index.mjs';
import type { Price } from '@settings/index.mjs';

interface ContainerSystemSource {
  maxContentWeight: number | null;
  /** When true, contents weigh nothing for the carrier (e.g. bag of holding). */
  contentsAreWeightless: boolean;
}

interface ContainerSystemData extends ContainerSystemSource, PhysicalItemSystemData {
  /** Derived: summed effective weight of contained items. Never stored. */
  contentsWeight: number;
  /** Derived: summed quantity of contained items. Never stored. */
  contentsCount: number;
  /** Derived: true when contentsWeight exceeds maxContentWeight. Never stored. */
  isOverCapacity: boolean;
  /** Derived: total value of contained items. Never stored. */
  contentsValue: Price;
}

export type {
  ContainerSystemData,
  ContainerSystemSource,
};
