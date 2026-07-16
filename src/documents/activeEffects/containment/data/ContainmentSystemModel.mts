import { ActiveEffectSystemModel } from '@effects/baseActiveEffect/data/ActiveEffectSystemModel.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/index.mjs';
import { requiredNumberField } from '@fields/fieldBuilders.mjs';

import { buildContainmentChanges } from './buildContainmentChanges.mjs';
import type { ContainmentSystemData } from './ContainmentSystemData.mjs';

const { fields: { StringField } } = foundry.data;

/**
 * System model for the item-contribution AE placed on a container bag.
 * Stores which item is contributing and its pre-computed weight/qty values.
 * The bag reads these AEs in prepareDerivedData to compute contentsWeight
 * and contentsCount without polling items on every cycle.
 */
class ContainmentSystemModel extends ActiveEffectSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.CONTAINMENT'];

  static override defineSchema (): Record<string, any> {
    const schema = super.defineSchema();

    schema.sourceItemUuid = new StringField({ required: true, nullable: true, initial: null });
    schema.contributedWeight = requiredNumberField(0);
    schema.contributedCount = requiredNumberField(0);

    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    this.changes = this.buildChanges();
  }
  
  buildChanges(): EffectChangeDataDnd35e[] {
    return buildContainmentChanges({
      existingChanges: this.changes,
      contributedWeight: this.contributedWeight,
      contributedPrice: this.contributedPrice,
      contributedCount: this.contributedCount,
    });
  }
}

interface ContainmentSystemModel extends ContainmentSystemData {}

export { ContainmentSystemModel };
