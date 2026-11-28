import type { CurrencyData } from '@fields/index.mjs';
import type { ItemType } from '@items/itemTypes.mjs';
import type { PhysicalItemSystemData } from '@items/physical/physicalItem/index.mjs';
import type { PriceSource } from '@settings/index.mjs';

import type { ContainerTypeOption } from './constants.mjs';

interface ContainerSystemSource {
  maxContentWeight: number | null;
  /** When true, contents weigh nothing for the carrier (e.g. bag of holding). */
  contentsAreWeightless: boolean;
  /** The type of container (bag, quiver, etc.). */
  containerType: ContainerTypeOption;
  /** If true, the container can hold currency. */
  allowsCurrency: boolean;
  /** The currency contained within the container. */
  containedCurrency: PriceSource;
  /** Allowed item types for this container. */
  allowedItemTypes: ItemType[] | null;
  /** Further filtering by subtype. */
  allowedItemSubtypes: string[] | null;
}

interface ContainerSystemData extends Omit<ContainerSystemSource, 'containedCurrency' | 'allowedItemTypes' | 'allowedItemSubtypes'>, PhysicalItemSystemData {
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
  /** Instantiated: the allowed item types for this container. */
  allowedItemTypes: Set<ItemType> | null;
  /** Instantiated: the allowed subtypes for this container. */
  allowedItemSubtypes: Set<string> | null;
}

export type {
  ContainerSystemData,
  ContainerSystemSource,
};
