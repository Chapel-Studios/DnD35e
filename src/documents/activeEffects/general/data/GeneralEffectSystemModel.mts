import { ActiveEffectSystemModel } from '@effects/baseActiveEffect/data/ActiveEffectSystemModel.mjs';

import type { GeneralEffectSystemData } from './GeneralEffectSystemData.mjs';

/**
 * General active effect system model — the standard effect type for dnd35e.
 * No additional fields beyond the base schema.
 */
class GeneralEffectSystemModel extends ActiveEffectSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.EFFECT.General'];
}

interface GeneralEffectSystemModel extends GeneralEffectSystemData {}

export { GeneralEffectSystemModel };
