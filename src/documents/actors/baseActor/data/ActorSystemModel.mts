import { FLY_MANEUVERABILITIES } from '@constants/index.mjs';
import { DocumentSystemModel } from '@documents/document/data/DocumentSystemModel.mjs';
import { CurrencyField } from '@fields/currency/CurrencyField.mjs';
import { requiredNumberField, useDnd35eField } from '@fields/fieldBuilders.mjs';
import { CurrencyData } from '@fields/index.mjs';

import type { ActorSystemData, ActorSystemSource } from './ActorSystemData.mjs';

const {
  SchemaField, StringField,
} = foundry.data.fields;

const speedField = (defaultValue: number) => useDnd35eField(requiredNumberField(defaultValue));

abstract class ActorSystemModel extends DocumentSystemModel<foundry.documents.Actor> {
  static override defineSchema(): Record<string, any> {
    const schema = super.defineSchema();

    schema.speed = new SchemaField({
      land:   speedField(30),
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

    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();

    // Speed has no separate "total" field — ActiveEffects (e.g. the encumbrance
    // DOWNGRADE) mutate `this.speed.<key>` in place during the 'final' phase.
    // Reset the live value back to the persisted source here (before that final
    // phase runs) so a DOWNGRADE-only effect can't compound/linger across
    // repeated `prepareData()` passes once its cause (e.g. encumbrance tier) is
    // gone. Mirrors the reset pattern used for `encumbrance.carriedWeight`/
    // `maxDexBonus`/`armorCheckPenalty` in `CreatureSystemModel.prepareBaseData()`.
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
