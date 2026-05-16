import type { EffectPhases } from '@common/documents/active-effect.mjs';
import type { Dnd35eEffectChangeData } from '@effects/BaseActiveEffect/data/ActiveEffectSystemData.mjs';
import { ActiveEffectSystemModelBase } from '@effects/BaseActiveEffect/data/ActiveEffectSystemModelBase.mjs';
import type { EffectChangeTarget, EffectChangeType } from '@effects/BaseActiveEffect/data/constants.mjs';
import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE } from '@effects/BaseActiveEffect/data/constants.mjs';
import type { MaterialSystemData } from '@effects/material/index.mjs';
import { requiredNumberField, useDnd35eField } from '@helpers/fieldBuilders.mjs';
import type { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import type { TargetContexts } from '@helpers/formulae/registry.mjs';
import { PriceField } from '@settings/currency/PriceField.mjs';
import type { PriceData } from '@settings/index.mjs';

import type { MaterialSubtype } from './materialTypes.mjs';
import { MATERIAL_SUBTYPE_BONUS_MAP, MATERIAL_SUBTYPE_STANDARD, MATERIAL_SUBTYPES } from './materialTypes.mjs';

const { fields: { StringField } } = foundry.data;

class MaterialSystemModel extends ActiveEffectSystemModelBase {
  static override targetContexts: TargetContexts = { item: ['weapon'] };
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.MATERIAL'];

  static override defineSchema () {
    const schema = super.defineSchema();

    // Declare Item context on inherited nameFormula
    (schema.nameFormula as FormulaField).formulaContexts = [
      { contextName: 'Item', resolvePath: 'parent', documentType: 'Item', fallbackSubtypes: ['weapon'], aliases: ['Parent'] },
    ];

    schema.price = useDnd35eField(new PriceField({}));
    schema.magicEquivalency = useDnd35eField(requiredNumberField(0));
    schema.hardness = useDnd35eField(requiredNumberField(0));
    schema.bonusHp = useDnd35eField(requiredNumberField(0));
    schema.damageReductionTypes = new foundry.data.fields.SetField(
      new foundry.data.fields.StringField({ required: true }),
      { initial: [] }
    );
    schema.materialSubtype = new StringField({
      required: true,
      initial: MATERIAL_SUBTYPE_STANDARD,
      choices: MATERIAL_SUBTYPES as readonly MaterialSubtype[],
    });

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

    // Identified value changes
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
      changes.push(this.buildBonusHpChange());
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
      bonusType: MATERIAL_SUBTYPE_BONUS_MAP[this.materialSubtype],
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

  buildBonusHpChange(): Dnd35eEffectChangeData {
    const existing = this.changes.find(change => change.key === 'system.hp.max' && change.isSystem);
    const fieldValue = this.bonusHp;
    return this._buildChange(
      'system.hp.max',
      fieldValue,
      existing ? existing.type : EFFECT_CHANGE_TYPE.ADD,
      'final',
      10,
      EFFECT_CHANGE_TARGET.ITEM
    );
  }

  buildBonusHardnessChange(): Dnd35eEffectChangeData {
    const existing = this.changes.find(change => change.key === 'system.hardness' && change.isSystem);
    const fieldValue = this.hardness;
    return this._buildChange(
      'system.hardness',
      fieldValue,
      existing ? existing.type : EFFECT_CHANGE_TYPE.ADD,
      'final',
      10,
      EFFECT_CHANGE_TARGET.ITEM
    );
  }

  buildMagicEquivalentChange(): Dnd35eEffectChangeData {
    const existing = this.changes.find(change => change.key === 'system.magicEquivalency' && change.isSystem);
    const fieldValue = this.magicEquivalency;
    return this._buildChange(
      'system.magicEquivalency',
      fieldValue,
      existing ? existing.type : EFFECT_CHANGE_TYPE.UPGRADE,
      'final',
      10,
      EFFECT_CHANGE_TARGET.ITEM
    );
  }

  buildPriceDifferenceChange(): Dnd35eEffectChangeData {
    const existing = this.changes.find(change => change.key === 'system.price' && change.isSystem);
    const fieldValue = this.price;
    return this._buildChange(
      'system.price',
      fieldValue,
      existing ? existing.type : EFFECT_CHANGE_TYPE.ADD,
      'final',
      10,
      EFFECT_CHANGE_TARGET.ITEM
    );
  }
}

interface MaterialSystemModel extends MaterialSystemData {}

export { MaterialSystemModel };
