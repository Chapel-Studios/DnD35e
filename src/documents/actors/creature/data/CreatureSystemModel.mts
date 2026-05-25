import { ActorSystemModel } from '@actors/baseActor/data/index.mjs';
import { CurrencyField } from '@fields/CurrencyField.mjs';
import {
  derivedNumberField,
  requiredNumberField,
} from '@fields/fieldBuilders.mjs';

import type { CreatureSystemData } from './CreatureSystemData.mjs';

const {
  SchemaField,
} = foundry.data.fields;

const abilityEntry = () => new SchemaField({
  base: requiredNumberField(10),
  mod:  derivedNumberField(0),
});

abstract class CreatureSystemModel extends ActorSystemModel {
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
      max:       derivedNumberField(0),
      current:   requiredNumberField(0),
      temp:      requiredNumberField(0),
      nonlethal: requiredNumberField(0),
    });

    schema.bab = new SchemaField({
      total: derivedNumberField(0),
    });

    schema.ac = new SchemaField({
      normal:     derivedNumberField(10),
      touch:      derivedNumberField(10),
      flatFooted: derivedNumberField(10),
    });

    const saveEntry = () => new SchemaField({
      total: derivedNumberField(0),
    });

    schema.saves = new SchemaField({
      fort: saveEntry(),
      ref:  saveEntry(),
      will: saveEntry(),
    });

    schema.init = new SchemaField({
      total: derivedNumberField(0),
    });

    schema.sr = requiredNumberField(0);

    schema.currency = new CurrencyField({ required: true });

    schema.encumbrance = new SchemaField({
      carriedWeight:   derivedNumberField(0),
      light:           derivedNumberField(0),
      medium:          derivedNumberField(0),
      heavy:           derivedNumberField(0),
      carry:           derivedNumberField(0),
      drag:            derivedNumberField(0),
      level:           derivedNumberField(0),
      carryBonus:      derivedNumberField(0),
      carryMultiplier: derivedNumberField(1),
    });

    return schema;
  }
}

interface CreatureSystemModel extends CreatureSystemData {}

export {
  CreatureSystemModel,
};
