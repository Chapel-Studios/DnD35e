import { DocumentSystemModel } from '@documents/document/data/DocumentSystemModel.mjs';
import { derivedNumberField, requiredNumberField } from '@fields/fieldBuilders.mjs';

import type { ActorSystemData } from './ActorSystemData.mjs';

const {
  HTMLField,
  SchemaField,
} = foundry.data.fields;

const speedEntry = () => new SchemaField({
  base:  requiredNumberField(0),
  total: derivedNumberField(0),
});

abstract class ActorSystemModel extends DocumentSystemModel<foundry.documents.Actor> {
  static override defineSchema(): Record<string, any> {
    const schema = super.defineSchema();

    schema.speed = new SchemaField({
      land:   new SchemaField({ base: requiredNumberField(30), total: derivedNumberField(30) }),
      climb:  speedEntry(),
      swim:   speedEntry(),
      burrow: speedEntry(),
      fly:    speedEntry(),
    });

    schema.notes = new HTMLField({ required: false, nullable: false, blank: true });

    return schema;
  }
}

interface ActorSystemModel extends ActorSystemData {}

export {
  ActorSystemModel,
};
