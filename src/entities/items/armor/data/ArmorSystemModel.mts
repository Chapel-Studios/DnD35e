import { DAMAGE_TYPES } from '@constants/attacks/damageTypes.mjs';
import {
  optionalStringField,
  requiredBooleanField,
  requiredNullableStringField,
} from '@helpers/fieldBuilders.mjs';
import { Dnd35eField } from '@helpers/fields/index.mjs';
import type { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import { EquippableItemSystemModel } from '@items/components/Equippable/index.mjs';

import { ARMOR_BASE_TYPES,ARMOR_SUBTYPES, ARMOR_TYPES } from '@items/armor/index.mjs';

const {
  fields: {
    NumberField,
    SchemaField,
    StringField,
  },
} = foundry.data;

class ArmorSystemModel extends EquippableItemSystemModel {
  static override defineSchema () {
    const schema = super.defineSchema();

    // Declare Owner context on inherited nameFormula (access inner FormulaField via .fields.value)
    (schema.nameFormula.fields.value as FormulaField).formulaContexts = [
      { contextName: 'Owner', resolvePath: 'parent', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['Parent'] },
    ];

    schema.isMasterwork = requiredBooleanField('D35E.IsMasterwork', 'D35E.IsMasterworkHint', false);
    schema.weaponType = new Dnd35eField(
      StringField, 
      { 
        choices: [
          ...ARMOR_TYPES,
        ],
        initial: 'simple',
        required: true,
      },
      {
        label: 'Armor Type',                                                                                                                                                                                                                                                                                                                           
        hint: 'The general type of this armor, which may affect which characters can use it and how it interacts with certain effects.',
        familiar: { aliases: ['type'] },
      });

    schema.armorSubtype = new Dnd35eField(StringField, { choices: [...ARMOR_SUBTYPES], initial: 'light', required: true }, { label: 'Weapon Subtype', hint: 'The specific subtype of this armor, which may affect its properties and usage.', familiar: { aliases: ['subtype'] } });
    schema.armorBaseType = new Dnd35eField(StringField, { choices: [...ARMOR_BASE_TYPES], initial: '', required: true, blank: true }, { label: 'Base Type', hint: 'The base type of this armor, which may affect its characteristics and interactions.' });

    schema.attackNotes = requiredNullableStringField('D35E.AttackNotes', 'D35E.AttackNotesHint');
    schema.damageNotes = requiredNullableStringField('D35E.DamageNotes', 'D35E.DamageNotesHint');

    return schema;
  }
}

export { ArmorSystemModel };
