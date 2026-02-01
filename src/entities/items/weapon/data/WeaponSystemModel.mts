import { ItemSystemModelBase } from "@items/baseItem/index.mjs";
import { applyPhysicalSchema } from "@items/components/Physical/index.mjs";
import { WEAPON_SUBTYPES, WEAPON_TYPES, WEAPOON_BASE_TYPES } from './constants.mjs';
import { DAMAGE_TYPES } from '@constants/attacks/damageTypes.mjs';
import {
  optionalStringField,
  requiredBooleanField,
  requiredNullableNumberField,
  requiredNullableStringField,
  requiredNumberField,
  requiredStringField,
  requiredTypedStringField
} from "@helpers/fieldBuilders.mjs";
import { applyHasMaterialsSchema } from "@items/components/HasMaterial/index.mjs";

const {
  fields: {
    SchemaField,
  }
} = foundry.data;

class WeaponSystemModel extends ItemSystemModelBase {
  static override defineSchema() {
    const schema = super.defineSchema();
    
    applyPhysicalSchema(schema);
    applyHasMaterialsSchema(schema);
    
    schema.isMasterwork = requiredBooleanField(false),
    schema.weaponType = requiredTypedStringField(WEAPON_TYPES, 'D35E.WeaponTypeSimple');
    schema.weaponSubtype = requiredTypedStringField(WEAPON_SUBTYPES, 'D35E.WeaponPropLight');
    schema.weaponBaseType = requiredTypedStringField(WEAPOON_BASE_TYPES, '', true);
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


// class WeaponSystemModel<
//   TParent extends WeaponDnd35e = WeaponDnd35e,
//   TSchema extends WeaponSystemSchema = WeaponSystemSchema
// > extends PhysicalItemSystemModel<TParent, TSchema> {
//   // static override defineSchema (): WeaponSystemSchema {

//   // }
// };

export { WeaponSystemModel };
