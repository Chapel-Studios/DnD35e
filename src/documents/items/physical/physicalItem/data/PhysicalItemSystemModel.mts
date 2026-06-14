import { SIZES } from '@constants/sizes.mjs';
import { IdentifiableSchemaMixin } from '@documents/identifiable/data/index.mjs';
import { materialEffectType } from '@effects/material/materialEffectType.mjs';
import { CurrencyField } from '@fields/CurrencyField.mjs';
import {
  derivedBooleanField,
  derivedNumberField,
  optionalNumberField,
  optionalStringField,
  requiredNumberField,
  useDnd35eField,
} from '@fields/fieldBuilders.mjs';
import { SectionField } from '@fields/SectionField.mjs';
import { ItemSystemModel } from '@items/baseItem/data/index.mjs';

import type { PhysicalItemSystemData } from './PhysicalItemSystemData.mjs';

const { fields: { ArrayField, StringField } } = foundry.data;

/** Pre-composed: ItemSystemModel + identifiable schema fields. */
const IdentifiableItemSystemModel = IdentifiableSchemaMixin(ItemSystemModel);

/**
 * Abstract system model for all physical items.
 * Inherits identifiable fields from {@link IdentifiableSchemaMixin} and adds
 * weight, HP, hardness, price, and container fields.
 */
abstract class PhysicalItemSystemModel extends IdentifiableItemSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.PHYSICAL_ITEM'];

  static override defineSchema (): Record<string, any> {
    const schema = super.defineSchema();

    // Physical
    schema.hp = new SectionField({
      current: useDnd35eField(requiredNumberField(0)),
      max: useDnd35eField(requiredNumberField(0)),
    });
    schema.hardness = useDnd35eField(requiredNumberField(0));
    schema.quantity = useDnd35eField(requiredNumberField(0));
    schema.weight = useDnd35eField(optionalNumberField(0));
    // schema.isWeightlessInContainer = requiredBooleanField(false);
    // schema.isWeightlessWhenCarried = requiredBooleanField(false);
    schema.isCarried = new foundry.data.fields.BooleanField({ initial: true, required: true });
    schema.size = useDnd35eField(new StringField({ choices: SIZES, initial: 'tiny', required: true }));
    // Price - EmbeddedDataField wrapping CurrencyData with coin stacks
    schema.price = useDnd35eField(new CurrencyField({}));
    // Derived fields (persisted: false) — initialized each cycle, never saved to DB.
    // FormulaFamiliar and AE targeting both rely on these being in the schema.
    schema.isBroken = derivedBooleanField(false);
    schema.magicEquivalency = derivedNumberField(0);
    schema.damageReductionTypes = new ArrayField(
      new StringField({ required: true }),
      { initial: [], persisted: false }
    );

    // Container
    schema.containerId = optionalStringField();

    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    if (!this.parent?.parent) {
      this.isCarried = false;
    }
    // isBroken: derived from active broken material AEs — persisted:false schema field.
    // HP changes trigger AE sync; the AE drives this flag.
    const effects = (this.parent as unknown as { effects?: Iterable<unknown> } | null)?.effects;
    const effectList = effects ? [...effects] : [];
    this.isBroken = effectList.some((e) => {
      const ae = e as unknown as ActiveEffect;
      return (
        ae.type === materialEffectType
        && (ae.system as { materialSubtype?: string } | undefined)?.materialSubtype === 'broken'
        && !ae.disabled
      );
    });
  }
}

interface PhysicalItemSystemModel extends PhysicalItemSystemData {}

export {
  PhysicalItemSystemModel,
};
