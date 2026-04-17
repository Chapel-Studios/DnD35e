import { Dnd35eDocumentSystemModel } from '@ec/CoreMixin/data/Dnd35eDocumentSystemModel.mjs';
import { EFFECT_TARGET } from '@effects/effectTypes.mjs';
import { requiredBooleanField } from '@helpers/fieldBuilders.mjs';
import { ensureNameFormula } from '@helpers/formulae/index.mjs';
import type { TargetContexts } from '@helpers/formulae/registry.mjs';

import { ACTIVE_EFFECT_TARGETS, CORE_EFFECT_CHANGE_PHASE, EFFECT_CHANGE_PHASES, EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TARGET_FIELD, EFFECT_CHANGE_TARGET_FIELDS, EFFECT_CHANGE_TARGETS, EFFECT_CHANGE_TYPE } from './constants.mjs';

const {
  ArrayField,
  SchemaField,
  StringField,
  NumberField,
  AnyField,
} = foundry.data.fields;

class ActiveEffectSystemModelBase extends Dnd35eDocumentSystemModel<foundry.documents.ActiveEffect> {
  /**
   * Declares which item/actor subtypes this effect type can target.
   * Used by AspectPicker to build autocomplete contexts.
   * Override in subclasses to declare specific subtypes.
   */
  static targetContexts: TargetContexts = {};
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.EFFECT'];

  static override defineSchema(): Record<string, any> {
    const superSchema = super.defineSchema();
    const schema = {
      target: new StringField({
        required: true,
        choices: ACTIVE_EFFECT_TARGETS,
        initial: EFFECT_TARGET,
      }),
      changes: new ArrayField(
        new SchemaField({
          key: new StringField({ required: true }),
          type: new StringField({ required: true, choices: Object.values(EFFECT_CHANGE_TYPE), initial: EFFECT_CHANGE_TYPE.ADD }),
          value: new AnyField({ required: true }),
          priority: new NumberField({ required: true, initial: 0 }),
          phase: new StringField({
            required: true,
            choices: EFFECT_CHANGE_PHASES,
            initial: CORE_EFFECT_CHANGE_PHASE,
          }),
          target: new StringField({
            required: true,
            choices: EFFECT_CHANGE_TARGETS,
            initial: EFFECT_CHANGE_TARGET.ITEM,
          }),
          targetField: new StringField({
            required: true,
            choices: EFFECT_CHANGE_TARGET_FIELDS,
            initial: EFFECT_CHANGE_TARGET_FIELD.VALUE,
          }),
          isSystem: requiredBooleanField(false),
          bonusType: new StringField({ required: false, nullable: true, initial: null }),
          condition: new StringField({ required: false, nullable: true, initial: null }),
        }),
        { initial: [] }
      ),
    };
    
    return foundry.utils.mergeObject(superSchema, schema);
  }

  override prepareBaseData (): void {
    super.prepareBaseData();
    const parentName = this.parent?.name;
    if (!parentName) {
      console.warn('ActiveEffectSystemModelBase.prepareBaseData: ActiveEffect parent has no name; skipping ensureNameFormula.', {
        effect: this,
        parent: this.parent,
      });
      return;
    }
    ensureNameFormula(this, parentName);
  }
}

export {
  ActiveEffectSystemModelBase,
};
