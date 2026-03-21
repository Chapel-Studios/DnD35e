import type { EffectPhases } from '@common/documents/active-effect.mjs';
import { IdentifiableSchemaMixin } from '@ec/Identifiable/index.mjs';
import type { Dnd35eEffectChangeData, EffectChangeTarget, EffectChangeType } from '@effects/BaseActiveEffect/index.mjs';
import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE } from '@effects/BaseActiveEffect/index.mjs';
import { ActiveEffectSystemModelBase } from '@effects/BaseActiveEffect/index.mjs';
import type { MaterialSystemData } from '@effects/material/index.mjs';
import { requiredNumberField } from '@helpers/fieldBuilders.mjs';
import { priceSchema } from '@items/components/Physical/index.mjs';
import { Price } from '@settings/index.mjs';

/** Pre-composed: ActiveEffectSystemModelBase + identifiable schema fields. */
const IdentifiableEffectSystemModel = IdentifiableSchemaMixin(ActiveEffectSystemModelBase);

class MaterialSystemModel extends IdentifiableEffectSystemModel {
  static override defineSchema () {
    const schema = super.defineSchema();

    schema.price = priceSchema();
    schema.magicEquivalent = requiredNumberField(0);
    schema.hardness = requiredNumberField(0);
    schema.bonusHp = requiredNumberField(0);
    schema.damageReductionTypes = new foundry.data.fields.SetField(
      new foundry.data.fields.StringField({ required: true }),
      { initial: [] }
    );

    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    this.changes = this.buildChanges();
  }

  buildChanges(): Dnd35eEffectChangeData[] {
    const changes: Dnd35eEffectChangeData[] = [
      ...this.changes.filter(change => !change.isSystem),
    ];
    if (this.price.length !== 0) { 
      changes.push(this.buildPriceDifferenceChange());
    }
    if (this.magicEquivalent !== 0) {
      changes.push(this.buildMagicEquivalentChange());
    }
    if (this.hardness !== 0) {
      changes.push(this.buildBonusHardnessChange());
    }
    if (this.bonusHp !== 0) {
      changes.push(this.buildBonusHpPerInchChange());
    }
    for (const drType of this.damageReductionTypes) {
      changes.push(this.buildDamageReductionTypeChange(drType));
    }
    return changes;
  }

  _buildChange(
    key: string,
    value: string | number | Price,
    type: EffectChangeType = EFFECT_CHANGE_TYPE.ADD,
    phase: EffectPhases = 'final',
    priority: number = 10,
    target: EffectChangeTarget = EFFECT_CHANGE_TARGET.ITEM
  ): Dnd35eEffectChangeData {
    return {
      key,
      type,
      value,
      phase,
      priority,
      target,
      effect: null,
      isSystem: true,
    };
  }

  buildDamageReductionTypeChange(drType: string): Dnd35eEffectChangeData {
    return this._buildChange(
      'system.damageReductionTypes',
      drType
    );
  }

  // TODO: how should this actually work? Items just have HP, not HP-per-inch.
  // We should relook at how we handle item HP, perhaps add thickness and calculate HP based on that?
  buildBonusHpPerInchChange(): Dnd35eEffectChangeData {
    return this._buildChange(
      'system.hp.max',
      this.bonusHp
    );
  }

  buildBonusHardnessChange(): Dnd35eEffectChangeData {
    return this._buildChange(
      'system.hardness',
      this.hardness
    );
  }

  // TODO: This key doesn't currently exist,
  // we need to determine how to handle these equivalencies in the system.
  buildMagicEquivalentChange(): Dnd35eEffectChangeData {
    return this._buildChange(
      'system.magicEquivalent',
      this.magicEquivalent,
      EFFECT_CHANGE_TYPE.UPGRADE
    );
  }

  buildPriceDifferenceChange(): Dnd35eEffectChangeData {
    return this._buildChange(
      'system.price',
      this.price
    );
  }
}

interface MaterialSystemModel extends MaterialSystemData {}

export { MaterialSystemModel };
