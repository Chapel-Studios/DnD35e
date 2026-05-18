import type { ActiveEffectSystemData, ActiveEffectSystemSourceDnd35e } from '@effects/BaseActiveEffect/data/ActiveEffectSystemData.mjs';

/**
 * General active effect system data — the standard effect data type for dnd35e.
 * No additional fields; pure base AE schema.
 */
interface GeneralSystemSource extends ActiveEffectSystemSourceDnd35e {
}

interface GeneralSystemData extends ActiveEffectSystemData {
}

export type {
  GeneralSystemData,
  GeneralSystemSource,
};
