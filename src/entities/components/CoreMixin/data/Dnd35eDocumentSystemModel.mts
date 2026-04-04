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
        excludedFields: ['name'],
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
        familiar: { formulaVisible: false },
        label: 'Description',
        hint: 'The item description, shown in the item sheet and when hovering the item in the inventory.',
      }),
    };
    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    const nameFormula = this.nameFormula;
    const doc = this.parent as unknown as DocumentContext;
    const nameFormulaField = (this.constructor as any).schema?.fields?.nameFormula as FormulaField | undefined;
    const dataMap = this._buildFormulaDataMap(doc, nameFormulaField?.formulaContexts ?? []);
    const excluded = nameFormulaField?.excludedFields ?? [];
    if (nameFormula?.formula) {
      nameFormula.resolvedValue = nameFormula.resolve(dataMap, this.derivedName, excluded);
      this.derivedName = nameFormula.resolvedValue;
    }
    if (nameFormula?.unidentifiedFormula) {
      nameFormula.unidentifiedResolvedValue = nameFormula.resolveUnidentified(dataMap, '', excluded);
    }
  }

  /**
   * Build the formula data map for a specific formula field.
   * Resolves additional contexts from the field's declared context list.
   */
  protected _buildFormulaDataMap(doc: DocumentContext, declarations: { contextName: string; resolvePath?: string }[]): Record<string, DocumentContext> {
    const map: Record<string, DocumentContext> = { self: doc };
    for (const decl of declarations) {
      if (!decl.resolvePath) continue; // Runtime-provided context, skip auto-resolution
      const resolved = this._resolveContextPath(doc, decl.resolvePath);
      if (resolved) {
        map[decl.contextName] = resolved;
      }
    }
    return map;
  }

  /**
   * Walk a dot-separated path from a document to resolve a context source.
   * e.g. 'parent' → doc.parent, 'parent.parent' → doc.parent.parent
   */
  private _resolveContextPath(doc: DocumentContext, path: string): DocumentContext | undefined {
    let current: any = doc;
    for (const segment of path.split('.')) {
      if (!current) return undefined;
      current = current[segment];
    }
    return current?.documentName ? current : undefined;
  }
}

export {
  Dnd35eDocumentSystemModel,
};
