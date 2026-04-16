import { DAMAGE_TYPES } from '@constants/attacks/damageTypes.mjs';
import {
  optionalStringField,
  requiredBooleanField,
  requiredNullableStringField,
} from '@helpers/fieldBuilders.mjs';
import { Dnd35eField } from '@helpers/fields/index.mjs';
import type { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import { EquippableItemSystemModel } from '@items/components/Equippable/index.mjs';
import { WEAPON_BASE_TYPES,WEAPON_SUBTYPES, WEAPON_TYPES } from '@items/weapon/index.mjs';

const {
  fields: {
    NumberField,
    SchemaField,
    StringField,
  },
} = foundry.data;

class WeaponSystemModel extends EquippableItemSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.WEAPON'];

  static override defineSchema () {
    const schema = super.defineSchema();

    // Declare Owner context on inherited nameFormula (access inner FormulaField via .fields.value)
    (schema.nameFormula.fields.value as FormulaField).formulaContexts = [
      { contextName: 'Owner', resolvePath: 'parent', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['Parent'] },
    ];

    schema.isBaseWeaponType = requiredBooleanField(false);
    schema.isMasterwork = requiredBooleanField(false);
    schema.weaponType = new Dnd35eField(
      StringField, 
      { 
        choices: [
          ...WEAPON_TYPES,
        ],
        initial: 'simple',
        required: true,
      },
      {
        familiar: { aliases: ['type'] },
      });
    schema.weaponSubtype = new Dnd35eField(StringField, { choices: [...WEAPON_SUBTYPES], initial: 'light', required: true }, { familiar: { aliases: ['subtype'] } });
    schema.weaponBaseType = new Dnd35eField(StringField, { choices: [...WEAPON_BASE_TYPES], initial: '', required: true, blank: true });
    schema.weaponDamage = new SchemaField({
      damageRoll: new Dnd35eField(StringField, { initial: '', required: true, blank: true }, { familiar: { aliases: ['roll', 'dice'] } }),
      damageType: new Dnd35eField(StringField, { choices: [...DAMAGE_TYPES], initial: 'D35E.DRSlashing', required: true }, { familiar: { aliases: ['type'] } }),
      critRange: new Dnd35eField(StringField, { required: true, initial: '20' }, { familiar: { aliases: ['range', 'threat'] } }),
      critMultiplier: new Dnd35eField(NumberField, { required: true, nullable: false, initial: 2 }, { familiar: { aliases: ['multiplier', 'mult'] } }),
      rangeIncrement: new Dnd35eField(NumberField, { required: true, nullable: true }),
      attackFormula: optionalStringField(),
      damageFormula: optionalStringField(),
    });
    schema.attackNotes = requiredNullableStringField();
    schema.damageNotes = requiredNullableStringField();
    schema.noAmmoRequired = requiredBooleanField(false);

    return schema;
  }
}

export { WeaponSystemModel };
