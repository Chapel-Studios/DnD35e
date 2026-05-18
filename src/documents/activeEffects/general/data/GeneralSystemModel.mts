import { ActiveEffectSystemModel } from '@effects/baseActiveEffect/data/ActiveEffectSystemModel.mjs';

import type { GeneralSystemData } from './GeneralSystemData.mjs';

/**
 * General active effect system model — the standard effect type for dnd35e.
 * No additional fields beyond the base schema.
 */
class GeneralSystemModel extends ActiveEffectSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.EFFECT.General'];
}

interface GeneralSystemModel extends GeneralSystemData {}

export { GeneralSystemModel };
