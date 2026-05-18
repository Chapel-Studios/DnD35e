import type { ActiveEffectSystemData, ActiveEffectSystemSourceDnd35e, Dnd35eEffectChangeData } from '@effects/BaseActiveEffect/data/ActiveEffectSystemData.mjs';
import type { Price, PriceSource } from '@settings/index.mjs';
import type { PriceData } from '@settings/index.mjs';

import type { MaterialSubtype } from './materialTypes.mjs';

type MaterialSystemStats = {
  price: PriceSource;
  magicEquivalency: number;
  hardness: number;
  bonusHp: number;
  damageReductionTypes: string[];
  materialSubtype: MaterialSubtype;
}

interface MaterialEffectChangeData extends Dnd35eEffectChangeData {
  value: string | number | Price;
}

interface MaterialSystemSource extends MaterialSystemStats, ActiveEffectSystemSourceDnd35e {
  changes: MaterialEffectChangeData[];
}

interface MaterialSystemData extends MaterialSystemStats, ActiveEffectSystemData {
  price: PriceData;
}

export type {
  MaterialSystemData,
  MaterialSystemSource,
  MaterialSystemStats,
};
