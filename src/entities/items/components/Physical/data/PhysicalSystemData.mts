import { Size } from '@constants/sizes.mjs';
import { IdentifiableDocumentSystemData } from '@entities/components/Identifiable/index.mjs';
import type { ItemSystemSource } from '@items/baseItem/index.mjs';
import type { Price } from '@settings/currency/index.mjs';

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
  // Price - array of coin stacks, each with a coin type and count
  price: Price;
  resalePrice: Price | null;
  brokenResalePrice: Price | null;
  isBroken: boolean;
  // Container
  containerId: string | null;
}

interface PhysicalItemSystemData extends ItemSystemSource, PhysicalItemSystemSource,
  IdentifiableDocumentSystemData {
    effectiveWeight: number;
    // Material might apply these
    magicEquivalent?: number;
    damageReductionTypes?: string[];
  }

export type {
  PhysicalItemSystemData,
  PhysicalItemSystemSource,
};
