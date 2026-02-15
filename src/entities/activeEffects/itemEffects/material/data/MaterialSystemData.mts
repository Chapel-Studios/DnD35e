import type { IdentifiableItemSystemData, IdentifiableItemSystemSource } from '@ec/Identifiable/index.mjs';
import { ItemEffectSystemData, ItemEffectSystemSource } from '../../ItemEffect/index.mjs';

type MaterialSystemStats = {
  priceDifference: number;
  magicEquivalent: number;
  bonusHardness: number;
  bonusHpPerInch: number;
  isAlchemicalSilverEquivalent: boolean;
  isAdamantineEquivalent: boolean;
  isColdIronEquivalent: boolean;
}

interface MaterialSystemSource extends MaterialSystemStats, IdentifiableItemSystemSource, ItemEffectSystemSource {}

interface MaterialSystemData extends MaterialSystemStats, IdentifiableItemSystemData, ItemEffectSystemData {}

export type {
  MaterialSystemStats,
  MaterialSystemSource,
  MaterialSystemData,
};
