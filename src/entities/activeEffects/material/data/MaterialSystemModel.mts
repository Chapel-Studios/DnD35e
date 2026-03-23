import type { EffectPhases } from '@common/documents/active-effect.mjs';
import { IdentifiableSchemaMixin } from '@ec/Identifiable/index.mjs';
import type { Dnd35eEffectChangeData, EffectChangeTarget, EffectChangeType } from '@effects/BaseActiveEffect/index.mjs';
import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE } from '@effects/BaseActiveEffect/index.mjs';
import { ActiveEffectSystemModelBase } from '@effects/BaseActiveEffect/index.mjs';
import type { MaterialSystemData } from '@effects/material/index.mjs';
import { requiredNumberField } from '@helpers/fieldBuilders.mjs';
import { PriceField } from '@settings/currency/index.mjs';
import type { Price, PriceData } from '@settings/index.mjs';

/** Pre-composed: ActiveEffectSystemModelBase + identifiable schema fields. */
const IdentifiableEffectSystemModel = IdentifiableSchemaMixin(ActiveEffectSystemModelBase);

class MaterialSystemModel extends IdentifiableEffectSystemModel {
  static override defineSchema () {
    const schema = super.defineSchema();

    schema.price = new PriceField();
    schema.magicEquivalency = requiredNumberField(0);
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
    if (!this.price.isEmpty) {
      changes.push(this.buildPriceDifferenceChange());
    }
    if (this.magicEquivalency !== 0) {
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
    value: string | number | PriceData,
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
    const existing = this.changes.find(change => change.key === 'system.damageReductionTypes' && change.isSystem);
    return this._buildChange(
      'system.damageReductionTypes',
      drType,
      existing ? existing.type : EFFECT_CHANGE_TYPE.ADD
    );
  }

  // TODO: how should this actually work? Items just have HP, not HP-per-inch.
  // We should relook at how we handle item HP, perhaps add thickness and calculate HP based on that?
  buildBonusHpPerInchChange(): Dnd35eEffectChangeData {
    const existing = this.changes.find(change => change.key === 'system.hp.max' && change.isSystem);
    return this._buildChange(
      'system.hp.max',
      this.bonusHp,
      existing ? existing.type : EFFECT_CHANGE_TYPE.ADD
    );
  }

  buildBonusHardnessChange(): Dnd35eEffectChangeData {
    const existing = this.changes.find(change => change.key === 'system.hardness' && change.isSystem);
    return this._buildChange(
      'system.hardness',
      this.hardness,
      existing ? existing.type : EFFECT_CHANGE_TYPE.ADD
    );
  }

  // TODO: This key doesn't currently exist,
  // we need to determine how to handle these equivalencies in the system.
  buildMagicEquivalentChange(): Dnd35eEffectChangeData {
    const existing = this.changes.find(change => change.key === 'system.magicEquivalency' && change.isSystem);
    return this._buildChange(
      'system.magicEquivalency',
      this.magicEquivalency,
      existing ? existing.type : EFFECT_CHANGE_TYPE.UPGRADE
    );
  }

  buildPriceDifferenceChange(): Dnd35eEffectChangeData {
    const existing = this.changes.find(change => change.key === 'system.price' && change.isSystem);
    return this._buildChange(
      'system.price',
      this.price,
      existing ? existing.type : EFFECT_CHANGE_TYPE.ADD
    );
  }
}

interface MaterialSystemModel extends MaterialSystemData {}

export { MaterialSystemModel };
