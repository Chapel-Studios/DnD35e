import { DAMAGE_TYPES } from '@constants/attacks/damageTypes.mjs';
import {
  optionalStringField,
  requiredBooleanField,
  requiredNullableNumberField,
  requiredNullableStringField,
  requiredNumberField,
  requiredStringField,
  requiredTypedStringField,
} from '@helpers/fieldBuilders.mjs';
import { ItemSystemModelBase } from '@items/baseItem/index.mjs';
import { applyEquippableSchema } from '@items/components/Equippable/index.mjs';
import { WEAPON_BASE_TYPES,WEAPON_SUBTYPES, WEAPON_TYPES } from '@items/weapon/index.mjs';

const {
  fields: {
    SchemaField,
  },
} = foundry.data;

class WeaponSystemModel extends ItemSystemModelBase {
  static override defineSchema () {
    const schema = super.defineSchema();

    applyEquippableSchema(schema);

    schema.isMasterwork = requiredBooleanField(false);
    schema.weaponType = requiredTypedStringField(WEAPON_TYPES, 'simple');
    schema.weaponSubtype = requiredTypedStringField(WEAPON_SUBTYPES, 'light');
    schema.weaponBaseType = requiredTypedStringField(WEAPON_BASE_TYPES, '', true);
    schema.weaponDamage = new SchemaField({
      damageRoll: requiredNullableStringField(),
      damageType: requiredTypedStringField(DAMAGE_TYPES, 'D35E.DRSlashing'),
      critRange: requiredStringField('20'),
      critMultiplier: requiredNumberField(2),
      rangeIncrement: requiredNullableNumberField(),
      attackFormula: optionalStringField(),
      damageFormula: optionalStringField(),
    });
    schema.attackNotes = requiredNullableStringField();
    schema.damageNotes = requiredNullableStringField();

    return schema;
  }
}

export { WeaponSystemModel };
