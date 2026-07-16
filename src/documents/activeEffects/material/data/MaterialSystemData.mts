import type { ActiveEffectSystemData, ActiveEffectSystemSourceDnd35e, EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import type { CurrencyData } from '@fields/currency/CurrencyData.mjs';
import type { Price, PriceSource } from '@settings/index.mjs';

import type { MaterialSubtype } from './materialTypes.mjs';

type MaterialSystemStats = {
  price: PriceSource;
  magicEquivalency: number;
  hardness: number;
  bonusHp: number;
  damageReductionTypes: string[];
  materialSubtype: MaterialSubtype;
}

interface MaterialEffectChangeData extends EffectChangeDataDnd35e {
  value: string | number | Price;
}

interface MaterialSystemSource extends MaterialSystemStats, ActiveEffectSystemSourceDnd35e {
  changes: MaterialEffectChangeData[];
}

interface MaterialSystemData extends MaterialSystemStats, ActiveEffectSystemData {
  price: CurrencyData;
}

export type {
  MaterialSystemData,
  MaterialSystemSource,
  MaterialSystemStats,
};
