import { ActorSystemModel } from '@actors/baseActor/data/index.mjs';
import { LAW_AXES, MORAL_AXES } from '@constants/alignment.mjs';
import { SIZES } from '@constants/sizes.mjs';
import { CurrencyField } from '@fields/CurrencyField.mjs';
import {
  derivedNumberField,
  requiredNumberField,
  requiredTypedStringField,
  useDnd35eField,
} from '@fields/fieldBuilders.mjs';

import type { CreatureSystemData } from './CreatureSystemData.mjs';

const {
  ArrayField,
  BooleanField,
  HTMLField,
  SchemaField,
  StringField,
} = foundry.data.fields;

const abilityEntry = () => new SchemaField({
  base: useDnd35eField(requiredNumberField(10), { familiar: { aliases: ['score'] } }),
  mod:  useDnd35eField(derivedNumberField(0),   { familiar: { aliases: ['modifier'] } }),
});

const nullableBioField = () =>
  useDnd35eField(new StringField({ required: true, nullable: true, initial: null }));

abstract class CreatureSystemModel extends ActorSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.CREATURE'];

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    for (const ability of Object.values(this.abilities)) {
      ability.mod = Math.floor((ability.base - 10) / 2);
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
      current:   useDnd35eField(requiredNumberField(0)),
      temp:      useDnd35eField(requiredNumberField(0)),
      nonlethal: useDnd35eField(requiredNumberField(0)),
    });

    schema.bab = new SchemaField({
      total: useDnd35eField(derivedNumberField(0), { familiar: { aliases: ['baseAttackBonus'] } }),
    });

    schema.ac = new SchemaField({
      normal:     useDnd35eField(derivedNumberField(10)),
      touch:      useDnd35eField(derivedNumberField(10)),
      flatFooted: useDnd35eField(derivedNumberField(10)),
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

    schema.sr = useDnd35eField(requiredNumberField(0), { familiar: { aliases: ['spellResistance'] } });

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
      senses:    useDnd35eField(new StringField({ required: true, nullable: true, initial: null })),
    });

    schema.level = useDnd35eField(derivedNumberField(1), { familiar: { aliases: ['lvl'] } });

    schema.size = useDnd35eField(requiredTypedStringField(SIZES, 'medium'));

    schema.settings = new SchemaField({
      isPartyMember: new BooleanField({ initial: false }),
    });

    schema.notes = useDnd35eField(new HTMLField({ required: false, nullable: false, blank: true }));

    schema.currency = new CurrencyField({ required: true });

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

    return schema;
  }
}

interface CreatureSystemModel extends CreatureSystemData {}

export {
  CreatureSystemModel,
};
