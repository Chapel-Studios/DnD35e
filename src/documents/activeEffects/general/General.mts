import { ActiveEffectDnd35e } from '@effects/baseActiveEffect/ActiveEffectDnd35e.mjs';
import type { GeneralEffectSystemData } from '@effects/general/data/index.mjs';

/**
 * General active effect document class — the standard effect type for dnd35e.
 * No specialized behavior; delegates to ActiveEffectDnd35e base.
 */
class General extends ActiveEffectDnd35e {
  declare type: 'general';
  declare system: GeneralEffectSystemData;
}

export { General };
