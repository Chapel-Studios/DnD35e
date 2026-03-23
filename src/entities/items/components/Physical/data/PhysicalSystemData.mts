import { Size } from '@constants/sizes.mjs';
import { IdentifiableDocumentSystemData } from '@entities/components/Identifiable/index.mjs';
import type { ItemSystemSource } from '@items/baseItem/index.mjs';
import type { PriceSource } from '@settings/currency/index.mjs';
import type { PriceData } from '@settings/currency/index.mjs';

interface PhysicalItemSystemSource {
  quantity: number;
  weight: number | null;
  // isWeightlessInContainer: boolean;
  // isWeightlessWhenEquipped: boolean;
  isCarried: boolean;
  size: Size;
  hp: {
      value: number;
      max: number;
  };
  hardness: number;
  // Price - EmbeddedDataField wrapping PriceData with coin stacks
  price: PriceSource;
  resalePrice: PriceSource | null;
  brokenResalePrice: PriceSource | null;
  isBroken: boolean;
  // Container
  containerId: string | null;
}

interface PhysicalItemSystemData extends ItemSystemSource, PhysicalItemSystemSource,
  IdentifiableDocumentSystemData {
    // Prepared price fields are PriceData instances (with methods like .consolidate())
    price: PriceData;
    resalePrice: PriceData | null;
    brokenResalePrice: PriceData | null;
    effectiveWeight: number;
    // Material might apply these
    magicEquivalency?: number;
    damageReductionTypes?: string[];
  }

export type {
  PhysicalItemSystemData,
  PhysicalItemSystemSource,
};
