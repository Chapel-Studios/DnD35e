import type { ActiveEffectSystemData, Dnd35eActiveEffectSystemSource, Dnd35eEffectChangeData } from '@effects/BaseActiveEffect/data/ActiveEffectSystemData.mjs';
import type { Dnd35eFieldData } from '@helpers/fields/index.mjs';
import type { Price, PriceSource } from '@settings/index.mjs';
import type { PriceData } from '@settings/index.mjs';

import type { MaterialSubtype } from './materialTypes.mjs';

type MaterialSystemStats = {
  price: Dnd35eFieldData<PriceSource>;
  magicEquivalency: Dnd35eFieldData<number>;
  hardness: Dnd35eFieldData<number>;
  bonusHp: Dnd35eFieldData<number>;
  damageReductionTypes: string[];
  materialSubtype: MaterialSubtype;
}

interface MaterialEffectChangeData extends Dnd35eEffectChangeData {
  value: string | number | Price;
}

interface MaterialSystemSource extends MaterialSystemStats, Dnd35eActiveEffectSystemSource {
  changes: MaterialEffectChangeData[];
}

interface MaterialSystemData extends MaterialSystemStats, ActiveEffectSystemData {
  price: Dnd35eFieldData<PriceData>;
}

export type {
  MaterialSystemData,
  MaterialSystemSource,
  MaterialSystemStats,
};
