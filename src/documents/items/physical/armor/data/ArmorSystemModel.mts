import {
  requiredBooleanField,
  requiredNullableStringField,
  useDnd35eField,
} from '@fields/fieldBuilders.mjs';
import type { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import { EquippableItemSystemModel } from '@items/physical/equippableItem/data/index.mjs';

import type { ArmorSystemData } from './ArmorSystemData.mjs';
import { ARMOR_SUBTYPES, ARMOR_TYPES } from './constants.mjs';

const {
  fields: {
    StringField,
  },
} = foundry.data;

class ArmorSystemModel extends EquippableItemSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.ARMOR'];

  static override defineSchema () {
    const schema = super.defineSchema();

    // Declare Owner context on inherited nameFormula
    (schema.nameFormula as FormulaField).formulaContexts = [
      { contextName: 'Owner', resolvePath: 'parent', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['Parent'] },
    ];

    schema.isMasterwork = requiredBooleanField(false);
    schema.armorType = useDnd35eField(
      new StringField({
        choices: [...ARMOR_TYPES],
        initial: 'medium',
        required: true,
      }),
      { familiar: { aliases: ['type'] } }
    );
    schema.armorSubtype = useDnd35eField(
      new StringField({
        choices: [...ARMOR_SUBTYPES],
        initial: 'cloth',
        required: true,
      }),
      { familiar: { aliases: ['subtype'] } }
    );
    // TODO(oggy): wire up armorBaseType field once base-type system is finalised.
    // schema.armorBaseType = useDnd35eField(new StringField({ choices: [...ARMOR_BASE_TYPES], initial: '', required: true, blank: true }));

    schema.attackNotes = requiredNullableStringField();
    schema.damageNotes = requiredNullableStringField();

    return schema;
  }
}

interface ArmorSystemModel extends ArmorSystemData {}

export { ArmorSystemModel };

