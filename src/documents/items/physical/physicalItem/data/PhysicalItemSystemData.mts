import type { Size } from '@constants/sizes.mjs';
import type { IdentifiableDocumentSystemData } from '@documents/identifiable/index.mjs';
import type { CurrencyData } from '@fields/currency/CurrencyData.mjs';
import type { ItemSystemSource } from '@items/baseItem/index.mjs';
import type { PriceSource } from '@settings/currency/index.mjs';

interface ItemHpSource {
  current: number;
  max: number;
}

interface PhysicalItemSystemSource {
  quantity: number;
  weight: number;
  // isWeightlessInContainer: boolean;
  // isWeightlessWhenEquipped: boolean;
  isCarried: boolean;
  size: Size;
  hp: ItemHpSource;
  hardness: number;
  // Price - EmbeddedDataField wrapping CurrencyData with coin stacks
  price: PriceSource;
  // Container
  containerUuid: string | null;
}

interface PhysicalItemSystemData extends ItemSystemSource, PhysicalItemSystemSource,
  IdentifiableDocumentSystemData {
    // Prepared price fields are CurrencyData instances (with methods like .consolidate())
    price: CurrencyData;
    /** Derived: true when any active broken-material AE is present. */
    isBroken: boolean;
    // Material AEs apply these via changes; persisted:false schema fields reset them each cycle
    magicEquivalency: number;
    damageReductionTypes: string[];
  }

export type {
  ItemHpSource,
  PhysicalItemSystemData,
  PhysicalItemSystemSource,
};
