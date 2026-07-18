import type { ActiveEffectSystemData, ActiveEffectSystemSourceDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';

/**
 * General active effect system data — the standard effect data type for dnd35e.
 * No additional fields; pure base AE schema.
 */
interface GeneralEffectSystemSource extends ActiveEffectSystemSourceDnd35e {
}

interface GeneralEffectSystemData extends ActiveEffectSystemData {
}

export type {
  GeneralEffectSystemData,
  GeneralEffectSystemSource,
};
