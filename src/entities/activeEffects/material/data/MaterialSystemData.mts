import type { IdentifiableDocumentSystemData, IdentifiableDocumentSystemSource } from '@ec/Identifiable/index.mjs';
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

interface MaterialSystemSource extends MaterialSystemStats, IdentifiableDocumentSystemSource, Dnd35eActiveEffectSystemSource {}

interface MaterialSystemData extends MaterialSystemStats, IdentifiableDocumentSystemData, ActiveEffectSystemData {}

export type {
  MaterialSystemData,
  MaterialSystemSource,
  MaterialSystemStats,
};
