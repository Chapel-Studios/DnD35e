import { Dnd35eActiveEffect } from '@effects/BaseActiveEffect/Dnd35eActiveEffect.mjs';
import type { GeneralSystemData } from '@effects/general/data/index.mjs';

/**
 * General active effect document class — the standard effect type for dnd35e.
 * No specialized behavior; delegates to Dnd35eActiveEffect base.
 */
class General extends Dnd35eActiveEffect {
  declare type: 'general';
  declare system: GeneralSystemData;
}

export { General };
