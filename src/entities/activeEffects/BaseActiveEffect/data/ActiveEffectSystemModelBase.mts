import { Dnd35eDocumentSystemModel } from '@ec/CoreMixin/data/Dnd35eDocumentSystemModel.mjs';
import { ACTIVE_EFFECT_TARGETS, EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TARGETS } from '@effects/BaseActiveEffect/index.mjs';
import { EFFECT_TARGET } from '@effects/effectTypes.mjs';
import { ensureNameFormula } from '@helpers/formulae/index.mjs';

class ActiveEffectSystemModelBase extends Dnd35eDocumentSystemModel<foundry.documents.ActiveEffect> {
  static override defineSchema(): Record<string, any> {
    const superSchema = super.defineSchema();
    const schema = {
      target: new foundry.data.fields.StringField({
        required: true,
        choices: ACTIVE_EFFECT_TARGETS,
        initial: EFFECT_TARGET,
      }),
      changes: new foundry.data.fields.ArrayField(
        new foundry.data.fields.SchemaField({
          key: new foundry.data.fields.StringField({ required: true }),
          type: new foundry.data.fields.StringField({ required: true }),
          value: new foundry.data.fields.StringField({ required: true }),
          priority: new foundry.data.fields.NumberField({ required: true }),
          phase: new foundry.data.fields.StringField({
            required: true,
            choices: ['initial', 'final'],
            initial: 'initial',
          }),
          target: new foundry.data.fields.StringField({
            required: true,
            choices: EFFECT_CHANGE_TARGETS,
            initial: EFFECT_CHANGE_TARGET.ITEM,
          }),
        }),
        { initial: [] }
      ),
    };
    
    return foundry.utils.mergeObject(superSchema, schema);
  }

  override prepareBaseData (): void {
    ensureNameFormula(this, this.parent.name);
  }
}

export {
  ActiveEffectSystemModelBase,
};
