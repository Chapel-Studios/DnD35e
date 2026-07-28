import { ACTOR_TYPES } from '@actors/actorTypes.mjs';
import { ActiveEffectSystemModel } from '@effects/baseActiveEffect/data/ActiveEffectSystemModel.mjs';
import type { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import type { TargetContexts } from '@helpers/formulae/registry.mjs';
import { PHYSICAL_ITEM_TYPES } from '@items/itemTypes.mjs';

import type { GeneralEffectSystemData } from './GeneralEffectSystemData.mjs';

/**
 * General active effect system model — the standard effect type for dnd35e.
 *
 * Unlike Material (weapon-only) or Secret (always has a live parent), General
 * AEs are meant to target ANY item or actor subtype — including when edited
 * standalone (no live parent of the target kind to narrow the schema). So its
 * `targetContexts` is sourced from the full type registries rather than a
 * hardcoded list, and grows automatically as new item/actor subtypes register.
 */
class GeneralEffectSystemModel extends ActiveEffectSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.EFFECT.General'];
  static override targetContexts: TargetContexts = {
    item: [...PHYSICAL_ITEM_TYPES],
    actor: [...ACTOR_TYPES],
  };

  static override defineSchema (): Record<string, any> {
    const schema = super.defineSchema();

    // Parent could be an Item or an Actor (or neither, when edited standalone) —
    // no single fallback subtype makes sense, so schema-only editing without a
    // live parent just shows Self.
    (schema.nameFormula as FormulaField).formulaContexts = [
      { contextName: 'Parent', resolvePath: 'parent', documentType: 'Item', fallbackSubtypes: [] },
    ];

    return schema;
  }
}

interface GeneralEffectSystemModel extends GeneralEffectSystemData {}

export { GeneralEffectSystemModel };
