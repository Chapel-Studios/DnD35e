import { CreatureSystemModel } from '@actors/creature/index.mjs';
import { requiredBooleanField, useDnd35eField } from '@fields/fieldBuilders.mjs';

import type { CharacterSystemData } from './CharacterSystemData.mjs';

const {
  SchemaField,
  NumberField,
} = foundry.data.fields;

class CharacterSystemModel extends CreatureSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.CHARACTER'];

  static override defineSchema(): Record<string, any> {
    const schema = super.defineSchema();

    schema.xp = new SchemaField({
      value: useDnd35eField(
        new NumberField<number, number, true, false, true>({ required: true, nullable: false, initial: 0 }),
        { familiar: { aliases: ['experience'] } }
      ),
    });

    schema.isPartyMember = useDnd35eField(requiredBooleanField(false));

    return schema;
  }
}

interface CharacterSystemModel extends CharacterSystemData {}

export {
  CharacterSystemModel,
};
