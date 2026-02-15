import { requiredBooleanField, requiredNumberField } from '@helpers/fieldBuilders.mjs';
import { applyIdentifiableSchema } from '@ec/Identifiable/index.mjs';
import { ItemEffectSystemModel } from '../../ItemEffect/index.mjs';
import type { MaterialSystemData } from './MaterialSystemData.mjs';
import type { ItemEffectChangeData } from '@itemEffects/ItemEffect/index.mjs';
import { ActiveEffectChangeMode } from '@common/constants.mjs';
import { EffectPhases } from '@common/documents/active-effect.mjs';

class MaterialSystemModel extends ItemEffectSystemModel {
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

  buildChanges(): ItemEffectChangeData[] {
    const changes: ItemEffectChangeData[] = [];
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
    mode: ActiveEffectChangeMode = CONST.ACTIVE_EFFECT_MODES.ADD,
    phase: EffectPhases = 'final',
    priority: number = 10,
  ): ItemEffectChangeData {
    return {
      key,
      mode,
      value,
      phase,
      priority,
      effect: null, // to be filled in when the change is applied to an effect
    };
  }

  buildIsColdIronEquivalentChange(): ItemEffectChangeData {
    return this._buildChange(
      'system.isColdIronEquivalent',
      this.isColdIronEquivalent.toString(),
      CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    );
  }

  buildIsAdamantineEquivalentChange(): ItemEffectChangeData {
    return this._buildChange(
      'system.isAdamantineEquivalent',
      this.isAdamantineEquivalent.toString(),
      CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    );
  }

  buildIsAlchemicalSilverEquivalentChange(): ItemEffectChangeData {
    return this._buildChange(
      'system.isAlchemicalSilverEquivalent',
      this.isAlchemicalSilverEquivalent.toString(),
      CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    );
  }

  // TODO: how should this actually work? Items just have HP, not HP-per-inch.
  // We should relook at how we handle item HP, perhaps add thickness and calculate HP based on that?
  buildBonusHpPerInchChange(): ItemEffectChangeData {
    return this._buildChange(
      'system.hpPerInch',
      this.bonusHpPerInch.toString(),
    );
  }

  buildBonusHardnessChange(): ItemEffectChangeData {
    return this._buildChange(
      'system.hardness',
      this.bonusHardness.toString(),
    );
  }

  // TODO: This key doesn't currently exist,
  // we need to determine how to handle these equivalencies in the system.
  buildMagicEquivalentChange(): ItemEffectChangeData {
    return this._buildChange(
      'system.magicEquivalent',
      this.magicEquivalent.toString(),
      CONST.ACTIVE_EFFECT_MODES.UPGRADE,
    );
  }

  buildPriceDifferenceChange(): ItemEffectChangeData {
    return this._buildChange(
      'system.price',
      this.priceDifference.toString(),
    );
  }
}

// Declaration merging: adds all properties from inherent and composed types
interface MaterialSystemModel extends MaterialSystemData {}

export { MaterialSystemModel };
