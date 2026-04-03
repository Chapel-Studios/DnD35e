import { Size } from '@constants/sizes.mjs';
import { IdentifiableDocumentSystemData } from '@entities/components/Identifiable/index.mjs';
import type { Dnd35eFieldData } from '@helpers/fields/index.mjs';
import type { ItemSystemSource } from '@items/baseItem/index.mjs';
import type { PriceSource } from '@settings/currency/index.mjs';
import type { PriceData } from '@settings/currency/index.mjs';

interface PhysicalItemSystemSource {
  quantity: Dnd35eFieldData<number>;
  weight: Dnd35eFieldData<number | null>;
  // isWeightlessInContainer: boolean;
  // isWeightlessWhenEquipped: boolean;
  isCarried: boolean;
  size: Dnd35eFieldData<Size>;
  hp: {
      current: Dnd35eFieldData<number>;
      max: Dnd35eFieldData<number>;
  };
  hardness: Dnd35eFieldData<number>;
  // Price - EmbeddedDataField wrapping PriceData with coin stacks
  price: Dnd35eFieldData<PriceSource>;
  resalePrice: PriceSource | null;
  brokenResalePrice: PriceSource | null;
  isBroken: boolean;
  // Container
  containerId: string | null;
}

interface PhysicalItemSystemData extends ItemSystemSource, PhysicalItemSystemSource,
  IdentifiableDocumentSystemData {
    // Prepared price fields are PriceData instances (with methods like .consolidate())
    price: Dnd35eFieldData<PriceData>;
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
