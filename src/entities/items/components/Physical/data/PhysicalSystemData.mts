import { Size } from '@constants/sizes.mjs';
import { IdentifiableItemSystemData } from '@items/components/Identifiable/index.mjs';

interface PhysicalItemSystemSource {
  quantity: number;
  weight: number | null;
  isWeightlessInContainer: boolean;
  isWeightlessWhenCarried: boolean;
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
  isFullResalePrice: boolean;
  // Container
  containerId: string | null;
};

interface PhysicalItemSystemData extends PhysicalItemSystemSource, IdentifiableItemSystemData {};

export type {
  PhysicalItemSystemSource,
  PhysicalItemSystemData,
};