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
      current: new Dnd35eField(NumberField, { required: true, nullable: false, initial: 0 }, { label: 'HP', hint: 'The current HP of this item.' }),
      max: new Dnd35eField(NumberField, { required: true, nullable: false, initial: 0 }, { label: 'Max HP', hint: 'The maximum HP of this item.' }),
    });
    schema.hardness = new Dnd35eField(NumberField, { required: true, nullable: false, initial: 0 }, { label: 'Hardness', hint: 'The hardness of this item.' });
    schema.quantity = new Dnd35eField(NumberField, { required: true, nullable: false, initial: 0 }, { label: 'Quantity', hint: 'The quantity of this item.' });
    schema.weight = new Dnd35eField(NumberField, { required: false, nullable: true, initial: 0 }, { label: 'Weight', hint: 'The weight of this item.' });
    // schema.isWeightlessInContainer = requiredBooleanField(false);
    // schema.isWeightlessWhenCarried = requiredBooleanField(false);
    schema.isCarried = requiredBooleanField('D35E.IsCarried', 'D35E.IsCarriedHint', true);
    schema.size = new Dnd35eField(StringField, { choices: SIZES, initial: 'tiny', required: true }, { label: 'Size', hint: 'The size of this item.' });
    // Price - EmbeddedDataField wrapping PriceData with coin stacks
    schema.price = new Dnd35eField(PriceField, {}, { label: 'Price', hint: 'The price of this item.' });
    schema.resalePrice = new PriceField({ nullable: true, initial: null });
    schema.brokenResalePrice = new PriceField({ nullable: true, initial: null });
    schema.isBroken = requiredBooleanField('D35E.IsBroken', 'D35E.IsBrokenHint', false);

    // Container
    schema.containerId = optionalStringField('D35E.ContainerId', 'D35E.ContainerIdHint');

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
