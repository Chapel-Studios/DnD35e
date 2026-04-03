import type { Dnd35eFieldOverrides } from '@helpers/formulae/types.mjs';

const {
  StringField,
  SchemaField,
} = foundry.data.fields;

/**
 * Creates the shared overrides sub-schema used by Dnd35eField and FormulaField.
 * When null, the field uses default permissions (everyone can see, normal editability).
 *
 * @returns A nullable SchemaField matching {@link Dnd35eFieldOverrides}
 */
const fieldOverridesSchema = () => new SchemaField<Dnd35eFieldOverrides>({
  visibility: new StringField({
    choices: ['everyone', 'ownerPlus', 'gmOnly'],
    initial: 'everyone',
    required: true,
  }),
  editability: new StringField({
    choices: ['normal', 'gmOnly'],
    initial: 'normal',
    required: true,
  }),
}, { nullable: true, initial: null });

export { fieldOverridesSchema };
