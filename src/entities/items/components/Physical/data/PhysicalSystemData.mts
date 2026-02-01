import { Size } from '@constants/sizes.mjs';
import { DamagableItemSystemData } from '@items/components/Damagable/index.mjs';
import { IdentifiableItemSystemData } from '@items/components/Identifiable/index.mjs';

interface PhysicalItemSystemSource {
  quantity: number;
  weight: number | null;
  isWeightlessInContainer: boolean;
  isWeightlessWhenCarried: boolean;
  isCarried: boolean;
  size: Size;
  // Price
  price: number;
  resalePrice: number | null;
  brokenResalePrice: number | null;
  isFullResalePrice: boolean;
  // Container
  containerId: string | null;
};

interface PhysicalItemSystemData extends PhysicalItemSystemSource,
  IdentifiableItemSystemData,
  DamagableItemSystemData {};

export type {
  PhysicalItemSystemSource,
  PhysicalItemSystemData,
};