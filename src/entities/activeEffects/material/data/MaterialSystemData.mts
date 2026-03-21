import type { IdentifiableDocumentSystemData, IdentifiableDocumentSystemSource } from '@ec/Identifiable/index.mjs';
import { ActiveEffectSystemData, Dnd35eActiveEffectSystemSource, Dnd35eEffectChangeData } from '@effects/BaseActiveEffect/index.mjs';
import { Price } from '@settings/index.mjs';

type MaterialSystemStats = {
  price: Price;
  magicEquivalent: number;
  hardness: number;
  bonusHp: number;
  damageReductionTypes: string[];
}

interface MaterialEffectChangeData extends Dnd35eEffectChangeData {
  value: string | number | Price;
}

interface MaterialSystemSource extends MaterialSystemStats, IdentifiableDocumentSystemSource, Dnd35eActiveEffectSystemSource {
  changes: MaterialEffectChangeData[];
}

interface MaterialSystemData extends MaterialSystemStats, IdentifiableDocumentSystemData, ActiveEffectSystemData {}

export type {
  MaterialSystemData,
  MaterialSystemSource,
  MaterialSystemStats,
};
