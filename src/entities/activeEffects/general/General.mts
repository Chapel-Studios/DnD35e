import { DnD35eActiveEffect } from '@effects/BaseActiveEffect/DnD35eActiveEffect.mjs';
import type { GeneralSystemData } from '@effects/general/data/index.mjs';

/**
 * General active effect document class — the standard effect type for dnd35e.
 * No specialized behavior; delegates to DnD35eActiveEffect base.
 */
class General extends DnD35eActiveEffect {
  declare type: 'general';
  declare system: GeneralSystemData;
}

export { General };
