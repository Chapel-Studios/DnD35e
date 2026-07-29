import {
  optionalStringField,
  useDnd35eField,
  withFamiliar,
} from '@fields/fieldBuilders.mjs';
import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import type { DocumentContext } from '@helpers/formulae/registry.mjs';

import type { DocumentSystemData } from './DocumentSystemData.mjs';

const {
  HTMLField,
  SchemaField,
  StringField,
} = foundry.data.fields;

interface DocumentSystemModel<TDocType extends foundry.abstract.DataModel | null> extends foundry.abstract.TypeDataModel<
  TDocType,
  foundry.abstract.DataSchema
>, DocumentSystemData {
}

abstract class DocumentSystemModel<TDocType extends foundry.abstract.DataModel | null> extends foundry.abstract.TypeDataModel<
  TDocType,
  foundry.abstract.DataSchema
> {
  declare parent: TDocType;

  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.DOCUMENT'];

  static override defineSchema(): Record<string, any> {
    const schema = {
      origin: withFamiliar(new SchemaField({
        migrationVersion: new StringField({ nullable: true, required: false, initial: () => game.system.version }),
      }), { formulaVisible: false }),
      slug: withFamiliar(optionalStringField(), { formulaVisible: false }),
      nameFormula: useDnd35eField(new FormulaField({
        expectedType: 'string',
        canVisibilityBeChanged: false,
        excludedFields: ['name'],
        nullable: false,
        required: true,
        initial: () => ({
          formula: '',
          expectedType: 'string',
          resolvedValue: null,
        }),
      }), {
        familiar: { formulaVisible: false },
      }),
      description: useDnd35eField(new HTMLField(), {
        familiar: { formulaVisible: false },
      }),
    };

    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    const doc = this.parent as unknown as DocumentContext;
    const schema = (this.constructor as any).schema?.fields as Record<string, foundry.data.fields.DataField> | undefined;
    if (!schema) return;
    this._evaluateFormulaFields(this as unknown as Record<string, unknown>, schema, doc);
  }

  protected _evaluateFormulaFields(
    model: Record<string, unknown>,
    fields: Record<string, foundry.data.fields.DataField>,
    doc: DocumentContext
  ): void {
    for (const [key, field] of Object.entries(fields)) {
      const currentValue = model[key] as Record<string, unknown> | undefined;

      if (field instanceof FormulaField) {
        if (!currentValue || !('formula' in currentValue)) continue;
        const dataMap = this._buildFormulaDataMap(doc, field.formulaContexts ?? []);
        const excluded = field.excludedFields ?? [];
        const formulaSource = currentValue as unknown as {
          formula: string;
          expectedType: 'string' | 'number' | 'boolean';
          resolvedValue: string | null;
        };
        formulaSource.resolvedValue = formulaSource.formula
          ? FormulaData.resolveSource(formulaSource, dataMap, '', excluded)
          : null;
        continue;
      }

      if (field instanceof SchemaField && currentValue && typeof currentValue === 'object') {
        this._evaluateFormulaFields(
          currentValue,
          (field.fields as Record<string, foundry.data.fields.DataField> | undefined) ?? {},
          doc
        );
      }
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
  DocumentSystemModel,
};
