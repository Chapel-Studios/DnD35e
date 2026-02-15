import { ActiveEffectSystemData, Dnd35eActiveEffectSystemSource } from '@effects/BaseActiveEffect/data/ActiveEffectSystemData.mjs';
import { IdentifiableItemSystemData } from '@entities/components/Identifiable/index.mjs';

type ItemEffectSystemSource = Dnd35eActiveEffectSystemSource;

interface ItemEffectSystemData extends ItemEffectSystemSource, IdentifiableItemSystemData, ActiveEffectSystemData {}

export type {
  ItemEffectSystemData,
  ItemEffectSystemSource,
};