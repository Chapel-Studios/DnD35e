import type { EffectPhases } from '@common/documents/active-effect.mjs';
import { applyIdentifiableSchema } from '@ec/Identifiable/index.mjs';
import type { Dnd35eEffectChangeData, EffectChangeTarget, EffectChangeType } from '@effects/BaseActiveEffect/index.mjs';
import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE } from '@effects/BaseActiveEffect/index.mjs';
import { ActiveEffectSystemModelBase } from '@effects/BaseActiveEffect/index.mjs';
import type { MaterialSystemData } from '@effects/material/index.mjs';
import { requiredBooleanField, requiredNumberField } from '@helpers/fieldBuilders.mjs';

class MaterialSystemModel extends ActiveEffectSystemModelBase {
  static override defineSchema () {
    const schema = super.defineSchema();

    applyIdentifiableSchema(schema);

    schema.priceDifference = requiredNumberField(0);
    schema.magicEquivalent = requiredNumberField(0);
    schema.bonusHardness = requiredNumberField(0);
    schema.bonusHpPerInch = requiredNumberField(0);
    schema.isAlchemicalSilverEquivalent = requiredBooleanField(false);
    schema.isAdamantineEquivalent = requiredBooleanField(false);
    schema.isColdIronEquivalent = requiredBooleanField(false);

    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    this.changes = this.buildChanges();
  }

  buildChanges(): Dnd35eEffectChangeData[] {
    const changes: Dnd35eEffectChangeData[] = [];
    if (this.priceDifference !== 0) { 
      changes.push(this.buildPriceDifferenceChange());
    }
    if (this.magicEquivalent !== 0) {
      changes.push(this.buildMagicEquivalentChange());
    }
    if (this.bonusHardness !== 0) {
      changes.push(this.buildBonusHardnessChange());
    }
    if (this.bonusHpPerInch !== 0) {
      changes.push(this.buildBonusHpPerInchChange());
    }
    if (this.isColdIronEquivalent) {
      changes.push(this.buildIsColdIronEquivalentChange());
    }
    if (this.isAdamantineEquivalent) {
      changes.push(this.buildIsAdamantineEquivalentChange());
    }
    if (this.isAlchemicalSilverEquivalent) {
      changes.push(this.buildIsAlchemicalSilverEquivalentChange());
    }
    return changes;
  }

  _buildChange(
    key: string,
    value: string,
    type: EffectChangeType = EFFECT_CHANGE_TYPE.ADD,
    phase: EffectPhases = 'final',
    priority: number = 10,
    target: EffectChangeTarget = EFFECT_CHANGE_TARGET.ITEM,
  ): Dnd35eEffectChangeData {
    return {
      key,
      type,
      value,
      phase,
      priority,
      target,
      effect: null,
    };
  }

  buildIsColdIronEquivalentChange(): Dnd35eEffectChangeData {
    return this._buildChange(
      'system.isColdIronEquivalent',
      this.isColdIronEquivalent.toString(),
      EFFECT_CHANGE_TYPE.OVERRIDE,
    );
  }

  buildIsAdamantineEquivalentChange(): Dnd35eEffectChangeData {
    return this._buildChange(
      'system.isAdamantineEquivalent',
      this.isAdamantineEquivalent.toString(),
      EFFECT_CHANGE_TYPE.OVERRIDE,
    );
  }

  buildIsAlchemicalSilverEquivalentChange(): Dnd35eEffectChangeData {
    return this._buildChange(
      'system.isAlchemicalSilverEquivalent',
      this.isAlchemicalSilverEquivalent.toString(),
      EFFECT_CHANGE_TYPE.OVERRIDE,
    );
  }

  // TODO: how should this actually work? Items just have HP, not HP-per-inch.
  // We should relook at how we handle item HP, perhaps add thickness and calculate HP based on that?
  buildBonusHpPerInchChange(): Dnd35eEffectChangeData {
    return this._buildChange(
      'system.hpPerInch',
      this.bonusHpPerInch.toString(),
    );
  }

  buildBonusHardnessChange(): Dnd35eEffectChangeData {
    return this._buildChange(
      'system.hardness',
      this.bonusHardness.toString(),
    );
  }

  // TODO: This key doesn't currently exist,
  // we need to determine how to handle these equivalencies in the system.
  buildMagicEquivalentChange(): Dnd35eEffectChangeData {
    return this._buildChange(
      'system.magicEquivalent',
      this.magicEquivalent.toString(),
      EFFECT_CHANGE_TYPE.UPGRADE,
    );
  }

  buildPriceDifferenceChange(): Dnd35eEffectChangeData {
    return this._buildChange(
      'system.price',
      this.priceDifference.toString(),
    );
  }
}

interface MaterialSystemModel extends MaterialSystemData {}

export { MaterialSystemModel };
