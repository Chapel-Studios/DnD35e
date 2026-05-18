import type { Size } from '@constants/sizes.mjs';
import type { IdentifiableDocumentSystemData } from '@documents/identifiable/index.mjs';
import type { PriceData } from '@fields/PriceData.mjs';
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
  // Price - EmbeddedDataField wrapping PriceData with coin stacks
  price: PriceSource;
  isBroken: boolean;
  // Container
  containerId: string | null;
}

interface PhysicalItemSystemData extends ItemSystemSource, PhysicalItemSystemSource,
  IdentifiableDocumentSystemData {
    // Prepared price fields are PriceData instances (with methods like .consolidate())
    price: PriceData;
    effectiveWeight: number;
    // Material might apply these
    magicEquivalency?: number;
    damageReductionTypes?: string[];
  }

export type {
  PhysicalItemSystemData,
  PhysicalItemSystemSource,
};
