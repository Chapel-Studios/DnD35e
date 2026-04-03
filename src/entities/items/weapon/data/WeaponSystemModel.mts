import { DAMAGE_TYPES } from '@constants/attacks/damageTypes.mjs';
import {
  optionalStringField,
  requiredBooleanField,
  requiredNullableStringField,
} from '@helpers/fieldBuilders.mjs';
import { Dnd35eField } from '@helpers/fields/index.mjs';
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
  static override defineSchema () {
    const schema = super.defineSchema();

    schema.isMasterwork = requiredBooleanField(false);
    schema.weaponType = new Dnd35eField(StringField, { choices: [...WEAPON_TYPES], initial: 'simple', required: true }, { familiar: { formulaVisible: true, display: 'Weapon Type' }, label: 'Weapon Type', hint: 'The general type of this weapon, which may affect which characters can use it and how it interacts with certain effects.' });
    schema.weaponSubtype = new Dnd35eField(StringField, { choices: [...WEAPON_SUBTYPES], initial: 'light', required: true }, { familiar: { formulaVisible: true, display: 'Weapon Subtype' }, label: 'Weapon Subtype', hint: 'The specific subtype of this weapon, which may affect its properties and usage.' });
    schema.weaponBaseType = new Dnd35eField(StringField, { choices: [...WEAPON_BASE_TYPES], initial: '', required: true, blank: true }, { familiar: { formulaVisible: true, display: 'Base Type' }, label: 'Base Type', hint: 'The base type of this weapon, which may affect its characteristics and interactions.' });
    schema.weaponDamage = new SchemaField({
      damageRoll: new Dnd35eField(StringField, { initial: '', required: true, blank: true }, { familiar: { formulaVisible: true, display: 'Damage Roll' }, label: 'Damage Roll', hint: 'The roll used to determine the damage dealt by this weapon.' }),
      damageType: new Dnd35eField(StringField, { choices: [...DAMAGE_TYPES], initial: 'D35E.DRSlashing', required: true }, { familiar: { formulaVisible: true, display: 'Damage Type' }, label: 'Damage Type', hint: 'The type of damage this weapon deals, which may affect resistances and vulnerabilities.' }),
      critRange: new Dnd35eField(StringField, { required: true, initial: '20' }, { familiar: { formulaVisible: true, display: 'Critical Range' }, label: 'Critical Range', hint: 'The range of dice rolls that result in a critical hit.' }),
      critMultiplier: new Dnd35eField(NumberField, { required: true, nullable: false, initial: 2 }, { familiar: { formulaVisible: true, display: 'Critical Multiplier' }, label: 'Critical Multiplier', hint: 'The multiplier applied to damage on a critical hit.' }),
      rangeIncrement: new Dnd35eField(NumberField, { required: true, nullable: true }, { familiar: { formulaVisible: true, display: 'Range Increment' }, label: 'Range Increment', hint: 'The distance at which the weapon\'s range increment applies.' }),
      attackFormula: optionalStringField(),
      damageFormula: optionalStringField(),
    });
    schema.attackNotes = requiredNullableStringField();
    schema.damageNotes = requiredNullableStringField();

    return schema;
  }
}

export { WeaponSystemModel };
