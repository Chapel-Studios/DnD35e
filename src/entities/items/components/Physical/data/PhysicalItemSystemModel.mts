import { SIZES } from '@constants/sizes.mjs';
import { IdentifiableSchemaMixin } from '@ec/Identifiable/index.mjs';
import {
  optionalStringField,
  requiredBooleanField,
} from '@helpers/fieldBuilders.mjs';
import { Dnd35eField, Dnd35eSectionField } from '@helpers/fields/index.mjs';
import { ItemSystemModelBase } from '@items/baseItem/index.mjs';
import { PriceField } from '@settings/currency/index.mjs';

import { PhysicalItemSystemData } from './PhysicalSystemData.mjs';

const { fields: { NumberField, StringField } } = foundry.data;

/** Pre-composed: ItemSystemModelBase + identifiable schema fields. */
const IdentifiableItemSystemModel = IdentifiableSchemaMixin(ItemSystemModelBase);

/**
 * Abstract system model for all physical items.
 * Inherits identifiable fields from {@link IdentifiableSchemaMixin} and adds
 * weight, HP, hardness, price, and container fields.
 */
abstract class PhysicalItemSystemModel extends IdentifiableItemSystemModel {
  static override defineSchema (): Record<string, any> {
    const schema = super.defineSchema();

    // Physical
    schema.hp = new Dnd35eSectionField({
      current: new Dnd35eField(NumberField, { required: true, nullable: false, initial: 0 }, { familiar: { formulaVisible: true, display: 'HP' }, label: 'HP', hint: 'The current HP of this item.' }),
      max: new Dnd35eField(NumberField, { required: true, nullable: false, initial: 0 }, { familiar: { formulaVisible: true, display: 'Max HP' }, label: 'Max HP', hint: 'The maximum HP of this item.' }),
    });
    schema.hardness = new Dnd35eField(NumberField, { required: true, nullable: false, initial: 0 }, { familiar: { formulaVisible: true, display: 'Hardness' }, label: 'Hardness', hint: 'The hardness of this item.' });
    schema.quantity = new Dnd35eField(NumberField, { required: true, nullable: false, initial: 0 }, { familiar: { formulaVisible: true, display: 'Quantity' }, label: 'Quantity', hint: 'The quantity of this item.' });
    schema.weight = new Dnd35eField(NumberField, { required: false, nullable: true, initial: 0 }, { familiar: { formulaVisible: true, display: 'Weight' }, label: 'Weight', hint: 'The weight of this item.' });
    // schema.isWeightlessInContainer = requiredBooleanField(false);
    // schema.isWeightlessWhenCarried = requiredBooleanField(false);
    schema.isCarried = requiredBooleanField(true);
    schema.size = new Dnd35eField(StringField, { choices: SIZES, initial: 'tiny', required: true }, { familiar: { formulaVisible: true, display: 'Size' }, label: 'Size', hint: 'The size of this item.' });
    // Price - EmbeddedDataField wrapping PriceData with coin stacks
    schema.price = new Dnd35eField(PriceField, {}, { familiar: { formulaVisible: true, display: 'Price' }, label: 'Price', hint: 'The price of this item.' });
    schema.resalePrice = new PriceField({ nullable: true, initial: null });
    schema.brokenResalePrice = new PriceField({ nullable: true, initial: null });
    schema.isBroken = requiredBooleanField(false);

    // Container
    schema.containerId = optionalStringField();

    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    this.effectiveWeight = this.weight.value ?? 0;
    if (!this.parent?.parent) {
      this.isCarried = false;
    }
    this.magicEquivalency = this.magicEquivalency ?? 0;
    this.damageReductionTypes = this.damageReductionTypes ?? [];
  }
}

interface PhysicalItemSystemModel extends PhysicalItemSystemData {}

export {
  PhysicalItemSystemModel,
};
