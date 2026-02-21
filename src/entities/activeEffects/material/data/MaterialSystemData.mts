import type { IdentifiableItemSystemData, IdentifiableItemSystemSource } from '@ec/Identifiable/index.mjs';
import { ActiveEffectSystemData, Dnd35eActiveEffectSystemSource } from '@effects/BaseActiveEffect/index.mjs';

type MaterialSystemStats = {
  priceDifference: number;
  magicEquivalent: number;
  bonusHardness: number;
  bonusHpPerInch: number;
  isAlchemicalSilverEquivalent: boolean;
  isAdamantineEquivalent: boolean;
  isColdIronEquivalent: boolean;
}

interface MaterialSystemSource extends MaterialSystemStats, IdentifiableItemSystemSource, Dnd35eActiveEffectSystemSource {}

interface MaterialSystemData extends MaterialSystemStats, IdentifiableItemSystemData, ActiveEffectSystemData {}

export type {
  MaterialSystemData,
  MaterialSystemSource,
  MaterialSystemStats,
};
