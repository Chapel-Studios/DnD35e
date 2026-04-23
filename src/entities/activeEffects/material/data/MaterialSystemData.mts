import type { IdentifiableDocumentSystemData, IdentifiableDocumentSystemSource } from '@ec/Identifiable/index.mjs';
import { ActiveEffectSystemData, Dnd35eActiveEffectSystemSource, Dnd35eEffectChangeData } from '@effects/BaseActiveEffect/index.mjs';
import type { Dnd35eFieldData } from '@helpers/fields/index.mjs';
import type { Price, PriceSource } from '@settings/index.mjs';
import type { PriceData } from '@settings/index.mjs';

type MaterialSystemStats = {
  price: Dnd35eFieldData<PriceSource>;
  magicEquivalency: Dnd35eFieldData<number>;
  hardness: Dnd35eFieldData<number>;
  ac: Dnd35eFieldData<number>;
  bonusHp: Dnd35eFieldData<number>;
  damageReductionTypes: string[];
}

interface MaterialEffectChangeData extends Dnd35eEffectChangeData {
  value: string | number | Price;
}

interface MaterialSystemSource extends MaterialSystemStats, IdentifiableDocumentSystemSource, Dnd35eActiveEffectSystemSource {
  changes: MaterialEffectChangeData[];
}

interface MaterialSystemData extends MaterialSystemStats, IdentifiableDocumentSystemData, ActiveEffectSystemData {
  price: Dnd35eFieldData<PriceData>;
}

export type {
  MaterialSystemData,
  MaterialSystemSource,
  MaterialSystemStats,
};
