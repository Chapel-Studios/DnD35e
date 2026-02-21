import { applyBaseDnd35eSystemSchema } from '@ec/CoreMixin/index.mjs';
import { ACTIVE_EFFECT_TARGETS } from '@effects/BaseActiveEffect/index.mjs';
import { ITEM_EFFECT_TARGET } from '@entities/activeEffects/itemEffects/index.mjs';

class ActiveEffectSystemModelBase extends foundry.abstract.TypeDataModel<
  foundry.documents.ActiveEffect,
  foundry.abstract.DataSchema
> {
  declare parent: foundry.documents.ActiveEffect;

  static override defineSchema (): Record<string, any> {
    const schema = {
      target: new foundry.data.fields.StringField({
        required: true,
        choices: ACTIVE_EFFECT_TARGETS,
        initial: ITEM_EFFECT_TARGET,
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
        }),
        { initial: [] },
      ),
    };
    applyBaseDnd35eSystemSchema(schema);
    return schema;
  }
}

export {
  ActiveEffectSystemModelBase,
};
