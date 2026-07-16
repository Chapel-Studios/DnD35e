import { FLY_MANEUVERABILITIES } from '@constants/index.mjs';
import { DocumentSystemModel } from '@documents/document/data/DocumentSystemModel.mjs';
import { CurrencyField } from '@fields/currency/CurrencyField.mjs';
import { derivedNumberField, requiredNumberField, useDnd35eField } from '@fields/fieldBuilders.mjs';

import type { ActorSystemData } from './ActorSystemData.mjs';

const {
  SchemaField, StringField,
} = foundry.data.fields;

const speedEntry = (defaultValue: number) => new SchemaField({
  base:  useDnd35eField(requiredNumberField(defaultValue)),
  total: useDnd35eField(derivedNumberField(defaultValue)),
});

abstract class ActorSystemModel extends DocumentSystemModel<foundry.documents.Actor> {
  static override defineSchema(): Record<string, any> {
    const schema = super.defineSchema();

    schema.speed = new SchemaField({
      land:   speedEntry(30),
      climb:  speedEntry(0),
      swim:   speedEntry(0),
      burrow: speedEntry(0),
      fly:    speedEntry(0),
      flyManeuverability: useDnd35eField(new StringField({
        nullable: true,
        required: true,
        initial: null,
        choices: [...FLY_MANEUVERABILITIES],
      })),
    });

    schema.inventoryValue = useDnd35eField(new CurrencyField({ persisted: false }));

    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();

    this.speed.land.total = this.speed.land.base;
    this.speed.climb.total = this.speed.climb.base;
    this.speed.swim.total = this.speed.swim.base;
    this.speed.burrow.total = this.speed.burrow.base;
    this.speed.fly.total = this.speed.fly.base;
  }
}

interface ActorSystemModel extends ActorSystemData {}

export {
  ActorSystemModel,
};
