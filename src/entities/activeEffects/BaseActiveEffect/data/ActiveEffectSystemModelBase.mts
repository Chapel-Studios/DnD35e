import { applyBaseDnd35eSystemSchema } from '@ec/CoreMixin/index.mjs';
import { ACTIVE_EFFECT_TARGETS } from './index.mjs';

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
      }),
    };
    applyBaseDnd35eSystemSchema(schema);
    return schema;
  }
}

export {
  ActiveEffectSystemModelBase,
};