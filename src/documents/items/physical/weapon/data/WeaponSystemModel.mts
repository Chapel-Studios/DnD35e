import { DAMAGE_TYPE_SLASHING,DAMAGE_TYPES } from '@constants/attacks/damageTypes.mjs';
import { WEAPON_EQUIP_SLOTS, type WeaponEquipSlot } from '@constants/equipmentSlots.mjs';
import {
  optionalStringField,
  requiredBooleanField,
  requiredNullableStringField,
  useDnd35eField,
} from '@fields/fieldBuilders.mjs';
import type { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import { EquippableItemSystemModel } from '@items/physical/equippableItem/data/index.mjs';

import { WEAPON_BASE_TYPES, WEAPON_SUBTYPES, WEAPON_TYPES } from './constants.mjs';
import type { WeaponSystemData } from './WeaponSystemData.mjs';

const {
  fields: {
    NumberField,
    SchemaField,
    StringField,
    ArrayField,
  },
} = foundry.data;

class WeaponSystemModel extends EquippableItemSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.WEAPON'];

  static override defineSchema () {
    const schema = super.defineSchema();

    // Force Slots into subset of Weapon slots (mainHand, offHand, etc.)
    schema.availableEquipmentSlots = useDnd35eField( new ArrayField(
      new StringField<WeaponEquipSlot, WeaponEquipSlot, true, false, true>({ required: true }),
      { initial: [...WEAPON_EQUIP_SLOTS], required: true }
    ));

    // Declare Owner context on inherited nameFormula (it's now a plain FormulaField)
    (schema.nameFormula as FormulaField).formulaContexts = [
      { contextName: 'Owner', resolvePath: 'parent', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['Parent'] },
    ];

    schema.isBaseWeaponType = requiredBooleanField(false);
    schema.weaponType = useDnd35eField(
      new StringField({ 
        choices: [
          ...WEAPON_TYPES,
        ],
        initial: 'simple',
        required: true,
      }),
      {
        familiar: { aliases: ['type'] },
      });
    schema.weaponSubtype = useDnd35eField(new StringField({ choices: [...WEAPON_SUBTYPES], initial: 'light', required: true }), { familiar: { aliases: ['subtype'] } });
    schema.weaponBaseType = useDnd35eField(new StringField({ choices: [...WEAPON_BASE_TYPES], initial: '', required: true, blank: true }));
    schema.weaponDamage = new SchemaField({
      damageRoll: useDnd35eField(new StringField({ initial: '', required: true, blank: true }), { familiar: { aliases: ['roll', 'dice'] } }),
      damageType: useDnd35eField(new StringField({ choices: [...DAMAGE_TYPES], initial: DAMAGE_TYPE_SLASHING, required: true }), { familiar: { aliases: ['type'] } }),
      critRange: useDnd35eField(new StringField({ required: true, initial: '20' }), { familiar: { aliases: ['range', 'threat'] } }),
      critMultiplier: useDnd35eField(new NumberField({ required: true, nullable: false, initial: 2 }), { familiar: { aliases: ['multiplier', 'mult'] } }),
      rangeIncrement: useDnd35eField(new NumberField({ required: true, nullable: true })),
      attackFormula: optionalStringField(),
      damageFormula: optionalStringField(),
    });
    schema.attackNotes = requiredNullableStringField();
    schema.damageNotes = requiredNullableStringField();
    schema.noAmmoRequired = requiredBooleanField(false);

    return schema;
  }
}

interface WeaponSystemModel extends WeaponSystemData {}

export { WeaponSystemModel };
