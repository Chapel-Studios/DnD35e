const GENERAL_EFFECT_TYPE = 'general' as const;
type GeneralEffectType = typeof GENERAL_EFFECT_TYPE;

export { GENERAL_EFFECT_TYPE };
export { GeneralSystemModel } from '@effects/general/data/index.mjs';
export { General } from '@effects/general/General.mjs';

export type { GeneralEffectType };
