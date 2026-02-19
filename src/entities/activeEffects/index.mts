import type { DnD35eActiveEffectFlags } from './BaseActiveEffect/DnD35eActiveEffect.mjs';
import { DnD35eActiveEffect } from './BaseActiveEffect/DnD35eActiveEffect.mjs';
import type {
  ItemEffectTarget,
  ItemEffectType,
  ItemEffectTypeLocalizationValues,
} from './itemEffects/itemEffectTypes.mjs';
import { registerEffects } from './registration.mjs';

type EffectType = ItemEffectType;

export {
  DnD35eActiveEffect,
  registerEffects,
};

export type {
  DnD35eActiveEffectFlags,
  EffectType,
  ItemEffectTarget,
  ItemEffectType,
  ItemEffectTypeLocalizationValues,
};
