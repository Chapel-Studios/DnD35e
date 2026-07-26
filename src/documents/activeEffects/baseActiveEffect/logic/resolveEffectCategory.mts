import type { ActiveEffectDnd35e } from '@effects/baseActiveEffect/ActiveEffectDnd35e.mjs';
import type { EffectType } from '@effects/effectTypes.mjs';
import { EFFECT_TYPES } from '@effects/effectTypes.mjs';
import { secretEffectType } from '@effects/secret/secretEffectType.mjs';

/** Pseudo document-type id for status-driven effects. Not a real AE subtype - see doc comment below. */
const CONDITION_CATEGORY_ID = 'condition';
const CONDITION_CATEGORY_LABEL = 'dnd35e.EFFECT.Category.Condition';

/** Secret isn't in `EFFECT_TYPES` (that map is create-dialog eligibility, not display labels). */
const SECRET_CATEGORY_LABEL = 'dnd35e.EFFECT.Secret.Secrets';

interface EffectCategory {
  categoryId: string;
  categoryLabel: string;
}

/**
 * Derives the display category for an effect: a synthetic "condition" bucket for
 * any effect carrying `statuses` (i.e. created from/linked to a CONFIG.statusEffects
 * entry), otherwise its own document `type` (general/material/secret/containment).
 *
 * This is display-only. Conditions remain plain `general`-type ActiveEffects - no
 * dedicated `condition` document subtype exists or is needed, since nothing about
 * their schema differs from a general effect.
 */
function resolveEffectCategory(effect: ActiveEffectDnd35e): EffectCategory {
  if (effect.statuses?.size) {
    return { categoryId: CONDITION_CATEGORY_ID, categoryLabel: CONDITION_CATEGORY_LABEL };
  }
  const type = effect.type as EffectType;
  if (type === secretEffectType) {
    return { categoryId: type, categoryLabel: SECRET_CATEGORY_LABEL };
  }
  return {
    categoryId: type,
    categoryLabel: EFFECT_TYPES[type as keyof typeof EFFECT_TYPES] ?? type,
  };
}

export { CONDITION_CATEGORY_ID, CONDITION_CATEGORY_LABEL, resolveEffectCategory };
export type { EffectCategory };
