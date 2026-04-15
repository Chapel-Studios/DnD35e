import type { EffectPhases } from '@common/documents/active-effect.mjs';
import { IdentifiableSchemaMixin } from '@ec/Identifiable/index.mjs';
import type { Dnd35eEffectChangeData, EffectChangeTarget, EffectChangeTargetField, EffectChangeType } from '@effects/BaseActiveEffect/index.mjs';
import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TARGET_FIELD, EFFECT_CHANGE_TYPE } from '@effects/BaseActiveEffect/index.mjs';
import { ActiveEffectSystemModelBase } from '@effects/BaseActiveEffect/index.mjs';
import type { MaterialSystemData } from '@effects/material/index.mjs';
import { Dnd35eField } from '@helpers/fields/index.mjs';
import type { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import type { TargetContexts } from '@helpers/formulae/registry.mjs';
import { PriceField } from '@settings/currency/index.mjs';
import type { PriceData } from '@settings/index.mjs';

const { fields: { NumberField } } = foundry.data;

/** Pre-composed: ActiveEffectSystemModelBase + identifiable schema fields. */
const IdentifiableEffectSystemModel = IdentifiableSchemaMixin(ActiveEffectSystemModelBase);

class MaterialSystemModel extends IdentifiableEffectSystemModel {
  static override targetContexts: TargetContexts = { item: ['weapon'] };
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.MATERIAL'];

  static override defineSchema () {
    const schema = super.defineSchema();

    // Declare Item context on inherited nameFormula (access inner FormulaField via .fields.value)
    (schema.nameFormula.fields.value as FormulaField).formulaContexts = [
      { contextName: 'Item', resolvePath: 'parent', documentType: 'Item', fallbackSubtypes: ['weapon'], aliases: ['Parent'] },
    ];

    schema.price = new Dnd35eField(PriceField, {});
    schema.magicEquivalency = new Dnd35eField(NumberField, { required: true, nullable: false, initial: 0 });
    schema.hardness = new Dnd35eField(NumberField, { required: true, nullable: false, initial: 0 });
    schema.bonusHp = new Dnd35eField(NumberField, { required: true, nullable: false, initial: 0 });
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

    // Identified value changes
    if (!this.price.value.isEmpty) {
      changes.push(this.buildPriceDifferenceChange());
    }
    if (this.magicEquivalency.value !== 0) {
      changes.push(this.buildMagicEquivalentChange());
    }
    if (this.hardness.value !== 0) {
      changes.push(this.buildBonusHardnessChange());
    }
    if (this.bonusHp.value !== 0) {
      changes.push(this.buildBonusHpChange());
    }
    for (const drType of this.damageReductionTypes) {
      changes.push(this.buildDamageReductionTypeChange(drType));
    }

    // Unidentified value changes — emitted when the unidentifiedValue is explicitly set
    if (this.price.unidentifiedValue != null && !this.price.unidentifiedValue.isEmpty) {
      changes.push(this.buildPriceDifferenceChange(EFFECT_CHANGE_TARGET_FIELD.UNIDENTIFIED));
    }
    if (this.magicEquivalency.unidentifiedValue != null && this.magicEquivalency.unidentifiedValue !== 0) {
      changes.push(this.buildMagicEquivalentChange(EFFECT_CHANGE_TARGET_FIELD.UNIDENTIFIED));
    }
    if (this.hardness.unidentifiedValue != null && this.hardness.unidentifiedValue !== 0) {
      changes.push(this.buildBonusHardnessChange(EFFECT_CHANGE_TARGET_FIELD.UNIDENTIFIED));
    }
    if (this.bonusHp.unidentifiedValue != null && this.bonusHp.unidentifiedValue !== 0) {
      changes.push(this.buildBonusHpChange(EFFECT_CHANGE_TARGET_FIELD.UNIDENTIFIED));
    }

    return changes;
  }

  _buildChange(
    key: string,
    value: string | number | PriceData,
    type: EffectChangeType = EFFECT_CHANGE_TYPE.ADD,
    phase: EffectPhases = 'final',
    priority: number = 10,
    target: EffectChangeTarget = EFFECT_CHANGE_TARGET.ITEM,
    targetField: EffectChangeTargetField = EFFECT_CHANGE_TARGET_FIELD.VALUE
  ): Dnd35eEffectChangeData {
    return {
      key,
      type,
      value,
      phase,
      priority,
      target,
      targetField,
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

  buildBonusHpChange(
    targetField: EffectChangeTargetField = EFFECT_CHANGE_TARGET_FIELD.VALUE
  ): Dnd35eEffectChangeData {
    const existing = this.changes.find(change => change.key === 'system.hp.max' && change.isSystem && change.targetField === targetField);
    const fieldValue = targetField === EFFECT_CHANGE_TARGET_FIELD.UNIDENTIFIED
      ? this.bonusHp.unidentifiedValue!
      : this.bonusHp.value;
    return this._buildChange(
      'system.hp.max',
      fieldValue,
      existing ? existing.type : EFFECT_CHANGE_TYPE.ADD,
      'final',
      10,
      EFFECT_CHANGE_TARGET.ITEM,
      targetField
    );
  }

  buildBonusHardnessChange(
    targetField: EffectChangeTargetField = EFFECT_CHANGE_TARGET_FIELD.VALUE
  ): Dnd35eEffectChangeData {
    const existing = this.changes.find(change => change.key === 'system.hardness' && change.isSystem && change.targetField === targetField);
    const fieldValue = targetField === EFFECT_CHANGE_TARGET_FIELD.UNIDENTIFIED
      ? this.hardness.unidentifiedValue!
      : this.hardness.value;
    return this._buildChange(
      'system.hardness',
      fieldValue,
      existing ? existing.type : EFFECT_CHANGE_TYPE.ADD,
      'final',
      10,
      EFFECT_CHANGE_TARGET.ITEM,
      targetField
    );
  }

  buildMagicEquivalentChange(
    targetField: EffectChangeTargetField = EFFECT_CHANGE_TARGET_FIELD.VALUE
  ): Dnd35eEffectChangeData {
    const existing = this.changes.find(change => change.key === 'system.magicEquivalency' && change.isSystem && change.targetField === targetField);
    const fieldValue = targetField === EFFECT_CHANGE_TARGET_FIELD.UNIDENTIFIED
      ? this.magicEquivalency.unidentifiedValue!
      : this.magicEquivalency.value;
    return this._buildChange(
      'system.magicEquivalency',
      fieldValue,
      existing ? existing.type : EFFECT_CHANGE_TYPE.UPGRADE,
      'final',
      10,
      EFFECT_CHANGE_TARGET.ITEM,
      targetField
    );
  }

  buildPriceDifferenceChange(
    targetField: EffectChangeTargetField = EFFECT_CHANGE_TARGET_FIELD.VALUE
  ): Dnd35eEffectChangeData {
    const existing = this.changes.find(change => change.key === 'system.price' && change.isSystem && change.targetField === targetField);
    const fieldValue = targetField === EFFECT_CHANGE_TARGET_FIELD.UNIDENTIFIED
      ? this.price.unidentifiedValue!
      : this.price.value;
    return this._buildChange(
      'system.price',
      fieldValue,
      existing ? existing.type : EFFECT_CHANGE_TYPE.ADD,
      'final',
      10,
      EFFECT_CHANGE_TARGET.ITEM,
      targetField
    );
  }
}

interface MaterialSystemModel extends MaterialSystemData {}

export { MaterialSystemModel };
