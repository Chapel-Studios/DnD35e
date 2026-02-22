import { Size } from '@constants/sizes.mjs';
import { IdentifiableDocumentSystemData } from '@entities/components/Identifiable/index.mjs';

interface PhysicalItemSystemSource {
  quantity: number;
  weight: number | null;
  // isWeightlessInContainer: boolean;
  // isWeightlessWhenCarried: boolean;
  isCarried: boolean;
  size: Size;
  hp: {
      value: number;
      max: number;
  };
  hardness: number;
  // Price
  price: number;
  resalePrice: number | null;
  brokenResalePrice: number | null;
  isBroken: boolean;
  // Container
  containerId: string | null;
}

interface PhysicalItemSystemData extends PhysicalItemSystemSource,
  IdentifiableDocumentSystemData {}

export type {
  PhysicalItemSystemData,
  PhysicalItemSystemSource,
};
