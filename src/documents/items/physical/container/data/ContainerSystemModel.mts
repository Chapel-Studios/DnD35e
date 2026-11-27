import { CurrencyField } from '@fields/currency/CurrencyField.mjs';
import {
  derivedNumberField,
  requiredBooleanField,
  requiredTypedStringField,
  useDnd35eField,
} from '@fields/fieldBuilders.mjs';
import { CurrencyData } from '@fields/index.mjs';
import type { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import { PHYSICAL_ITEM_TYPES } from '@items/index.mjs';
import { PhysicalItemSystemModel } from '@items/physical/physicalItem/data/PhysicalItemSystemModel.mjs';

import { CONTAINER_TYPE, CONTAINER_TYPES } from './constants.mjs';
import type { ContainerSystemData } from './ContainerSystemData.mjs';

const {
  fields: {
    NumberField,
    SetField,
    StringField,
  },
} = foundry.data;

/**
 * System model for container items (backpacks, bags of holding, etc.).
 * Branches off {@link PhysicalItemSystemModel} — containers are not equippable.
 * contentsWeight and contentsCount are populated by item-contribution AEs that
 * contained items push onto this bag during _onUpdate.
 */
class ContainerSystemModel extends PhysicalItemSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.CONTAINER'];

  static override defineSchema (): Record<string, any> {
    const schema = super.defineSchema();

    // Declare Owner context on inherited nameFormula (matches Weapon's pattern)
    (schema.nameFormula as FormulaField).formulaContexts = [
      { contextName: 'Owner', resolvePath: 'parent', documentType: 'Actor', fallbackSubtypes: ['character'], aliases: ['Parent'] },
    ];

    schema.containerType = useDnd35eField(requiredTypedStringField(CONTAINER_TYPES, CONTAINER_TYPE.BAG));
    schema.maxContentWeight = useDnd35eField(new NumberField({ required: true, nullable: true, initial: null, min: 0 }));
    schema.contentsAreWeightless = useDnd35eField(requiredBooleanField(false));
    schema.containedCurrency = useDnd35eField(new CurrencyField());
    schema.allowsCurrency = useDnd35eField(requiredBooleanField(true));
    schema.allowedItemTypes = useDnd35eField(new SetField(new StringField({ choices: [...PHYSICAL_ITEM_TYPES] }), { required: true, nullable: true, initial: null }));
    schema.allowedItemSubtypes = useDnd35eField(new SetField(new StringField(), { required: true, nullable: true, initial: null }));

    // Derived (persisted: false) — recomputed each cycle from contained items.
    schema.contentsWeight = derivedNumberField(0);
    schema.contentsCount = derivedNumberField(0);
    schema.contentsValue = useDnd35eField(new CurrencyField({ persisted: false }));
    return schema;
  }

  override prepareBaseData() {
    super.prepareBaseData();

    this.contentsWeight = 0;
    this.contentsCount = 0;
    this.contentsValue = new CurrencyData();
  }

  /**
   * Derived: true when contents exceed capacity. Computed lazily so it always
   * reflects the final contentsWeight after AE application (prepareDerivedData
   * is sealed, so there is no post-AE hook to write a stored field).
   */
  get isOverCapacity (): boolean {
    return this.maxContentWeight !== null && this.contentsWeight > this.maxContentWeight;
  }

  override prepareDerivedData() {
    super.prepareDerivedData();

    if (this.containerType === CONTAINER_TYPE.PURSE) this.allowsCurrency = true;
  }
}

interface ContainerSystemModel extends ContainerSystemData {}

export { ContainerSystemModel };
