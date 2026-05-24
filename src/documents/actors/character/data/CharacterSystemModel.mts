import { CreatureSystemModel } from '@actors/creature/index.mjs';
import { SIZES } from '@constants/sizes.mjs';
import { derivedNumberField, requiredBooleanField, requiredTypedStringField } from '@fields/fieldBuilders.mjs';

import type { CharacterSystemData } from './CharacterSystemData.mjs';

const {
  HTMLField,
  SchemaField,
  NumberField,
  StringField,
} = foundry.data.fields;

const LAW_AXES = ['lawful', 'neutral', 'chaotic'] as const;
const MORAL_AXES = ['good', 'neutral', 'evil'] as const;

class CharacterSystemModel extends CreatureSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.CHARACTER'];

  static override defineSchema(): Record<string, any> {
    const schema = super.defineSchema();

    schema.level = derivedNumberField(1);

    schema.xp = new SchemaField({
      value: new NumberField<number, number, true, false, true>({ required: true, nullable: false, initial: 0 }),
    });

    schema.alignment = new SchemaField({
      law:   new StringField({ nullable: true, required: true, initial: null, choices: [...LAW_AXES] }),
      moral: new StringField({ nullable: true, required: true, initial: null, choices: [...MORAL_AXES] }),
    });

    schema.race = new StringField({
      required: true,
      nullable: true,
      initial: null,
      persisted: false,
    });

    schema.size = requiredTypedStringField(SIZES, 'medium');

    schema.isPartyMember = requiredBooleanField(false);

    schema.notes = new HTMLField({ required: false, nullable: false, blank: true });

    return schema;
  }
}

interface CharacterSystemModel extends CharacterSystemData {}

export {
  CharacterSystemModel,
};
