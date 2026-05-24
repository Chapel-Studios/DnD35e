import type { Size } from '@constants/sizes.mjs';
import type { IdentifiableDocumentSystemData } from '@documents/identifiable/index.mjs';
import type { CurrencyData } from '@fields/CurrencyData.mjs';
import type { ItemSystemSource } from '@items/baseItem/index.mjs';
import type { PriceSource } from '@settings/currency/index.mjs';

interface PhysicalItemSystemSource {
  quantity: number;
  weight: number | null;
  // isWeightlessInContainer: boolean;
  // isWeightlessWhenEquipped: boolean;
  isCarried: boolean;
  size: Size;
  hp: {
      current: number;
      max: number;
  };
  hardness: number;
  // Price - EmbeddedDataField wrapping CurrencyData with coin stacks
  price: PriceSource;
  // Container
  containerId: string | null;
}

interface PhysicalItemSystemData extends ItemSystemSource, PhysicalItemSystemSource,
  IdentifiableDocumentSystemData {
    // Prepared price fields are CurrencyData instances (with methods like .consolidate())
    price: CurrencyData;
    effectiveWeight: number;
    /** Derived: true when any active broken-material AE is present. */
    isBroken: boolean;
    // Material might apply these
    magicEquivalency?: number;
    damageReductionTypes?: string[];
  }

export type {
  PhysicalItemSystemData,
  PhysicalItemSystemSource,
};
