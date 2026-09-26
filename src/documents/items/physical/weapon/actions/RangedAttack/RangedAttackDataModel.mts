import { requiredNumberField } from '@fields/fieldBuilders.mjs';
import { ACTION_TYPE, ACTION_TYPES } from '@items/baseItem/actions/constants.mjs';

import { WeaponAttackDataModel } from '../WeaponAttack/WeaponAttackDataModel.mjs';
import { RANGED_WEAPON_PROPERTIES, type RangedWeaponProperty } from './constants.mjs';
import type { RangedAttackSourceData } from './RangedAttackSourceData.mjs';

const {
  fields: {
    BooleanField,
    StringField,
    SetField,
  },
} = foundry.data;

class RangedWeaponAttack extends WeaponAttackDataModel {
  declare properties: Set<RangedWeaponProperty>;

  static override defineSchema(): Record<string, any> {
    const schema = super.defineSchema();
    schema.type = new StringField({
      required: true,
      blank: false,
      choices: [...ACTION_TYPES],
      initial: ACTION_TYPE.RANGED,
      validate: (value: unknown) => value === ACTION_TYPE.RANGED,
    });
    schema.rangeIncrement = requiredNumberField(2, 0);
    schema.isAmmoRequired = new BooleanField({ required: true, nullable: false, initial: false });
    schema.properties = new SetField(new StringField({ choices: [...RANGED_WEAPON_PROPERTIES] }));
    return schema;
  }
}
interface RangedWeaponAttack extends WeaponAttackDataModel,
  Omit<RangedAttackSourceData, 'attackFormula' | 'damageFormula' | 'name'> {}

export { RangedWeaponAttack };
