import {
  optionalStringField,
  requiredStringField,
} from '@helpers/fieldBuilders.mjs';
import { Dnd35eField } from '@helpers/fields/Dnd35eField.mjs';
import { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import type { DocumentContext } from '@helpers/formulae/registry.mjs';

import { BaseDnd35eSystemData } from './BaseDnd35eSystemData.mjs';

const {
  HTMLField,
} = foundry.data.fields;

interface Dnd35eDocumentSystemModel<TDocType extends foundry.abstract.DataModel | null> extends foundry.abstract.TypeDataModel<
  TDocType,
  foundry.abstract.DataSchema
>, BaseDnd35eSystemData {
}

abstract class Dnd35eDocumentSystemModel<TDocType extends foundry.abstract.DataModel | null> extends foundry.abstract.TypeDataModel<
  TDocType,
  foundry.abstract.DataSchema
> {
  declare parent: TDocType;

  static override defineSchema(): Record<string, any> {
    const schema = {
      version: requiredStringField('14.0.0'),
      slug: optionalStringField(),
      derivedName: requiredStringField(),
      nameFormula: new FormulaField({
        label: 'Name Formula',
        hint: 'A formula which calculates the name of this document based on other data. If no formula is provided, the name will be taken from the parent document.',
        expectedType: 'string',
        identifiable: true,
        canVisibilityBeChanged: false,
        nullable: false,
        required: true,
        initial: {
          formula: '',
          unidentifiedFormula: '',
          expectedType: 'string',
          resolvedValue: null,
          unidentifiedResolvedValue: null,
        },
      }),
      description: new Dnd35eField(HTMLField, {}, {
        label: 'Description',
        hint: 'The item description, shown in the item sheet and when hovering the item in the inventory.',
      }),
    };
    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    const nameFormula = this.nameFormula;
    if (nameFormula?.formula) {
      const dataMap: Record<string, DocumentContext> = { self: this.parent as unknown as DocumentContext };
      nameFormula.resolvedValue = nameFormula.resolve(dataMap, this.derivedName);
      this.derivedName = nameFormula.resolvedValue;
    }
    if (nameFormula?.unidentifiedFormula) {
      const dataMap: Record<string, DocumentContext> = { self: this.parent as unknown as DocumentContext };
      nameFormula.unidentifiedResolvedValue = nameFormula.resolveUnidentified(dataMap, '');
    }
  }
}

export {
  Dnd35eDocumentSystemModel,
};
