import { FLY_MANEUVERABILITIES, SIZES } from '@constants/index.mjs';
import { DocumentSystemModel } from '@documents/document/data/DocumentSystemModel.mjs';
import { CurrencyField } from '@fields/currency/CurrencyField.mjs';
import { requiredNumberField, requiredTypedStringField, useDnd35eField } from '@fields/fieldBuilders.mjs';
import { CurrencyData } from '@fields/index.mjs';

import type { ActorSystemData } from './ActorSystemData.mjs';

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

  override prepareBaseData (): void {
    super.prepareBaseData();

    // Reset before `applyActiveEffects('initial')` runs (inside `prepareEmbeddedDocuments()`,
    // which follows `prepareBaseData()`) — carried items contribute here via an 'initial'-phase
    // change (`PhysicalItem._buildCarriedChanges()`), so resetting any later (e.g. in
    // `prepareDerivedData()`, which runs *after* that phase) would wipe out their contribution
    // before anything ever reads it.
    this.inventoryValue = new CurrencyData();
  }
}

interface ActorSystemModel extends ActorSystemData {}

export {
  ActorSystemModel,
};
