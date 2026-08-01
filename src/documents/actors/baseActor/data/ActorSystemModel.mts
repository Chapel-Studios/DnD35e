import { FLY_MANEUVERABILITIES, SIZES } from '@constants/index.mjs';
import { DocumentSystemModel } from '@documents/document/data/DocumentSystemModel.mjs';
import { CurrencyField } from '@fields/currency/CurrencyField.mjs';
import { requiredNumberField, requiredTypedStringField, useDnd35eField } from '@fields/fieldBuilders.mjs';
import { CurrencyData } from '@fields/index.mjs';

import type { ActorSystemData, ActorSystemSource } from './ActorSystemData.mjs';

const {
  SchemaField, StringField,
} = foundry.data.fields;

const speedField = (defaultValue: number) => useDnd35eField(requiredNumberField(defaultValue));

abstract class ActorSystemModel extends DocumentSystemModel<foundry.documents.Actor> {
  static override defineSchema(): Record<string, any> {
    const schema = super.defineSchema();

    // Speed is stored in squares (canonical unit — 1 square = 5 ft = 1.5 m), translated
    // to the world's localized unit for display via `settingsStore.mts`'s
    // `convertToLocalizedDistance`/`convertToStoredDistance`. Land speed defaults to
    // 6 squares (30 ft, the SRD default for a Medium humanoid).
    schema.speed = new SchemaField({
      land:   speedField(6),
      climb:  speedField(0),
      swim:   speedField(0),
      burrow: speedField(0),
      fly:    speedField(0),
      flyManeuverability: useDnd35eField(new StringField({
        nullable: true,
        required: true,
        initial: null,
        choices: [...FLY_MANEUVERABILITIES],
      })),
    });

    schema.inventoryValue = useDnd35eField(new CurrencyField({ persisted: false }));

    schema.size = useDnd35eField(requiredTypedStringField(SIZES, 'medium'));

    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();

    // Speed fields are mutated by effects in 'final' phase. Reset from _source
    // here (before that phase) so DOWNGRADE effects don't persist after their
    // cause is gone. See CreatureSystemModel.prepareBaseData() for similar resets.
    const sourceSpeed = (this._source as unknown as ActorSystemSource).speed;
    this.speed.land = sourceSpeed.land;
    this.speed.climb = sourceSpeed.climb;
    this.speed.swim = sourceSpeed.swim;
    this.speed.burrow = sourceSpeed.burrow;
    this.speed.fly = sourceSpeed.fly;

    this.inventoryValue = new CurrencyData();
  }
}

interface ActorSystemModel extends ActorSystemData {}

export {
  ActorSystemModel,
};
