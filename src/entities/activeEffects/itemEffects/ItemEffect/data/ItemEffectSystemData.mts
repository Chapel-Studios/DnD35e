import { IdentifiableItemSystemData } from '@ec/Identifiable/index.mjs';
import { ActiveEffectSystemData, Dnd35eActiveEffectSystemSource } from '@effects/BaseActiveEffect/index.mjs';

type ItemEffectSystemSource = Dnd35eActiveEffectSystemSource;

interface ItemEffectSystemData extends ItemEffectSystemSource, IdentifiableItemSystemData, ActiveEffectSystemData {}

export type {
  ItemEffectSystemData,
  ItemEffectSystemSource,
};
