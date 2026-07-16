import { ActorSystemModel } from '@actors/baseActor/data/index.mjs';
import {
  LAW_AXES,
  MASKED_EDIT_STRATEGY,
  MORAL_AXES,
  SENSE_TYPES,
  SIZES,
} from '@constants/index.mjs';
import { CurrencyField } from '@fields/currency/CurrencyField.mjs';
import {
  derivedBooleanField,
  derivedNullableOptionalStringField,
  derivedNumberField,
  requiredNumberField,
  requiredTypedStringField,
  useDnd35eField,
} from '@fields/fieldBuilders.mjs';
import { FormulaField } from '@helpers/formulae/index.mjs';

import type { CreatureSystemData } from './CreatureSystemData.mjs';

const {
  ArrayField,
  BooleanField,
  HTMLField,
  SchemaField,
  StringField,
} = foundry.data.fields;

const abilityEntry = () => new SchemaField({
  score: useDnd35eField(requiredNumberField(10), { familiar: { aliases: ['score'] } }),
  mod:   useDnd35eField(derivedNumberField(0),   { familiar: { aliases: ['modifier'] } }),
});

const nullableBioField = () =>
  useDnd35eField(new StringField({ required: true, nullable: true, initial: null }));

abstract class CreatureSystemModel extends ActorSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.CREATURE'];

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    for (const ability of Object.values(this.abilities)) {
      ability.mod = Math.floor((ability.score - 10) / 2);
    }
  }

  static override defineSchema(): Record<string, any> {
    const schema = super.defineSchema();

    schema.abilities = new SchemaField({
      str: abilityEntry(),
      dex: abilityEntry(),
      con: abilityEntry(),
      int: abilityEntry(),
      wis: abilityEntry(),
      cha: abilityEntry(),
    });

    schema.hp = new SchemaField({
      max:       useDnd35eField(derivedNumberField(0)),
      current:   useDnd35eField(requiredNumberField(0), { maskedEditStrategy: MASKED_EDIT_STRATEGY.DELTA_MIRROR }),
      temp:      useDnd35eField(requiredNumberField(0), { maskedEditStrategy: MASKED_EDIT_STRATEGY.DELTA_MIRROR }),
      nonlethal: useDnd35eField(requiredNumberField(0), { maskedEditStrategy: MASKED_EDIT_STRATEGY.DELTA_MIRROR }),
      regeneration: useDnd35eField(derivedNumberField(0)),
      fastHealing: useDnd35eField(derivedNumberField(0)),
    });

    schema.bab = new SchemaField({
      total: useDnd35eField(derivedNumberField(0), { familiar: { aliases: ['baseAttackBonus'] } }),
    });
    schema.aooCount = useDnd35eField(derivedNumberField(1), { familiar: { aliases: ['attacksOfOpportunity'] } });

    schema.defense = new SchemaField({
      armorClass:     useDnd35eField(derivedNumberField(10)),
      touchAC:      useDnd35eField(derivedNumberField(10)),
      flatFootedAC: useDnd35eField(derivedNumberField(10)),
      naturalArmor:    useDnd35eField(derivedNumberField(0)),
      fortification: useDnd35eField(derivedNumberField(0)),
      concealment: useDnd35eField(derivedNumberField(0)),
      spellResistance: useDnd35eField(new FormulaField({
        expectedType: 'number',
        nullable: true,
        required: false,
        initial: () => ({
          formula: '',
          expectedType: 'number',
          resolvedValue: '0',
        }),
      }), {
        familiar: { aliases: ['spellResistance'] },
      }),
    });

    const saveEntry = () => new SchemaField({
      total: useDnd35eField(derivedNumberField(0)),
    });

    schema.saves = new SchemaField({
      fort: saveEntry(),
      ref:  saveEntry(),
      will: saveEntry(),
    });

    schema.init = new SchemaField({
      total: useDnd35eField(derivedNumberField(0), { familiar: { aliases: ['initiative'] } }),
    });

    schema.bio = new SchemaField({
      gender: useDnd35eField(nullableBioField()),
      deity:  useDnd35eField(nullableBioField()),
      age:    useDnd35eField(nullableBioField()),
      height: useDnd35eField(nullableBioField()),
      weight: useDnd35eField(nullableBioField()),
      alignment: new SchemaField({
        law:   useDnd35eField(new StringField({ nullable: true, required: true, initial: null, choices: [...LAW_AXES] })),
        moral: useDnd35eField(new StringField({ nullable: true, required: true, initial: null, choices: [...MORAL_AXES] })),
      }),
      languages: new ArrayField(new StringField({ required: true, blank: false }), { initial: [] }),
      senses: new ArrayField(new SchemaField({
        type:     useDnd35eField(requiredTypedStringField(SENSE_TYPES, 'darkvision')),
        distance: useDnd35eField(requiredNumberField(0)),
      }), { initial: [] }),
    });

    schema.level = useDnd35eField(derivedNumberField(1), { familiar: { aliases: ['lvl'] } });

    schema.size = useDnd35eField(requiredTypedStringField(SIZES, 'medium'));

    schema.settings = new SchemaField({
      isPartyMember: new BooleanField({ initial: false }),
    });

    schema.notes = useDnd35eField(new HTMLField({ required: false, nullable: false, blank: true }));

    schema.currency = new CurrencyField({ required: true });

    schema.attacks = new ArrayField(new SchemaField({
      damageRoll: new StringField({ required: true, initial: '', blank: true }),
      damageType: new StringField({ required: true, initial: '', blank: true }),
      critRange: new StringField({ required: true, initial: '20' }),
      critMultiplier: requiredNumberField(2),
      rangeIncrement: requiredNumberField(0),
      attackFormula: new StringField({ required: true, initial: '', blank: true }),
      damageFormula: new StringField({ required: true, initial: '', blank: true }),
    }), {
      initial: [],
      persisted: false,
    });

    schema.encumbrance = new SchemaField({
      carriedWeight:   useDnd35eField(derivedNumberField(0)),
      light:           useDnd35eField(derivedNumberField(0)),
      medium:          useDnd35eField(derivedNumberField(0)),
      heavy:           useDnd35eField(derivedNumberField(0)),
      carry:           useDnd35eField(derivedNumberField(0)),
      drag:            useDnd35eField(derivedNumberField(0)),
      level:           useDnd35eField(derivedNumberField(0)),
      carryBonus:      useDnd35eField(derivedNumberField(0)),
      carryMultiplier: useDnd35eField(derivedNumberField(1)),
    });

    schema.isIncorporeal = useDnd35eField(derivedBooleanField(false), { familiar: { aliases: ['incorporeal'] } });
    schema.isQuadraped = useDnd35eField(derivedBooleanField(false), { familiar: { aliases: ['quadraped'] } });

    schema.creatureType = useDnd35eField(derivedNullableOptionalStringField(null));

    return schema;
  }
}

interface CreatureSystemModel extends CreatureSystemData {}

export {
  CreatureSystemModel,
};
