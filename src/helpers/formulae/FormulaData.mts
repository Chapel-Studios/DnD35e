/**
 * FormulaData — DataModel for formula fields.
 *
 * Stores a formula string, its resolved value, and resolution metadata (expectedType).
 * Identified/unidentified duality is handled by wrapping FormulaField in Dnd35eField,
 * NOT by storing parallel formula variants inside FormulaData.
 *
 * @module
 */

import type { DocumentContext } from './registry.mjs';
import { buildDocumentFamiliar } from './registry.mjs';
import type { FamiliarSchema } from './types.mjs';
import { extractVariables, resolveFormula } from './utils.mjs';

const {
  StringField,
} = foundry.data.fields;

/**
 * Source shape written to the database for a FormulaData field.
 */
interface FormulaDataSource {
  formula: string;
  resolvedValue: string | number | null;
  expectedType: 'string' | 'number';
}

class FormulaData extends foundry.abstract.DataModel {
  // Declare model properties for TypeScript
  declare formula: string;
  declare resolvedValue: string | null;
  declare expectedType: 'string' | 'number';

  static override defineSchema() {
    return {
      formula: new StringField({ blank: true, initial: '' }),
      resolvedValue: new StringField({ nullable: true, initial: null }),
      expectedType: new StringField({ choices: ['string', 'number'], initial: 'string' }),
    };
  }

  // ---------------------------------------------------------------------------
  // Resolution
  // ---------------------------------------------------------------------------

  /**
   * Resolve the formula using a document data map.
   * Delegates to the existing resolveFormula() utility.
   *
   * @param documentDataMap Map of context names → live documents/objects
   * @param fallback Fallback value if formula is empty
   * @param excludedFields Top-level aspect keys to remove from the familiar before resolution
   * @returns Resolved string, or fallback if no formula
   */
  resolve(documentDataMap: Record<string, DocumentContext>, fallback: string = '', excludedFields: string[] = []): string {
    if (!this.formula) return fallback;
    const familiarSchema = FormulaData._buildFamiliarFromDocumentMap(documentDataMap, excludedFields);
    const partiallyResolved = resolveFormula(this.formula, familiarSchema, documentDataMap);
    return FormulaData._finalizeResolvedValue(partiallyResolved, this.expectedType);
  }

  // ---------------------------------------------------------------------------
  // Static source-level resolution (for POJOs, avoids DataModel construction)
  // ---------------------------------------------------------------------------

  /**
   * Resolve the formula from a raw FormulaDataSource POJO.
   * Use when you have serialized data (e.g. from toObject()) rather than a live DataModel.
   */
  static resolveSource(
    source: FormulaDataSource,
    documentDataMap: Record<string, unknown>,
    fallback: string = '',
    excludedFields: string[] = []
  ): string {
    if (!source.formula) return fallback;
    const familiarSchema = FormulaData._buildFamiliarFromDocumentMap(documentDataMap as Record<string, DocumentContext>, excludedFields);
    const partiallyResolved = resolveFormula(source.formula, familiarSchema, documentDataMap as Record<string, DocumentContext>);
    return FormulaData._finalizeResolvedValue(partiallyResolved, source.expectedType);
  }

  static resolveDisplaySource(
    source: FormulaDataSource,
    documentDataMap: Record<string, unknown>,
    fallback: string = '',
    excludedFields: string[] = []
  ): string {
    if (!source.formula) return fallback;
    const familiarSchema = FormulaData._buildFamiliarFromDocumentMap(documentDataMap as Record<string, DocumentContext>, excludedFields);
    return resolveFormula(source.formula, familiarSchema, documentDataMap as Record<string, DocumentContext>);
  }

  // ---------------------------------------------------------------------------
  // Source helpers
  // ---------------------------------------------------------------------------

  /**
   * Construct a FormulaData source object.
   * Convenience for use in migration scripts and tests.
   */
  static toSource(formula: string, opts: Partial<FormulaDataSource> = {}): FormulaDataSource {
    return {
      formula,
      resolvedValue: opts.resolvedValue ?? null,
      expectedType: opts.expectedType ?? 'string',
    };
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /**
   * Build a FamiliarSchema by auto-deriving schemas from the live documents
   * in the data map. Each document is introspected via buildDocumentFamiliar
   * to derive its property tree.
   *
   * @param documentDataMap Maps context names to their documents
   * @param excludedFields Top-level aspect keys to strip from every context's properties
   * @internal
   */
  private static _buildFamiliarFromDocumentMap(
    documentDataMap: Record<string, DocumentContext>,
    excludedFields: string[] = []
  ): FamiliarSchema {
    const schema: FamiliarSchema = {};
    for (const [contextName, doc] of Object.entries(documentDataMap)) {
      if (!doc) continue;
      const docSchema = buildDocumentFamiliar(doc);
      // buildDocumentFamiliar returns { self: ..., Owner/Item: ... } keyed by role.
      // Map the "self" entry to the actual context name from the data map.
      if (docSchema.self) {
        schema[contextName] = docSchema.self;
      }
      // Also merge any parent contexts that buildDocumentFamiliar discovered,
      // but only if we don't already have an entry for that context name
      // (explicit entries in the data map take precedence).
      for (const [key, ctx] of Object.entries(docSchema)) {
        if (key !== 'self' && !schema[key]) {
          schema[key] = ctx;
        }
      }
    }

    // Strip excluded fields from every context's properties
    if (excludedFields.length) {
      for (const ctx of Object.values(schema)) {
        for (const key of excludedFields) {
          delete ctx.properties[key];
        }
      }
    }

    return schema;
  }

  private static _finalizeResolvedValue(resolved: string, expectedType: 'string' | 'number'): string {
    if (expectedType !== 'number') return resolved;
    if (extractVariables(resolved).length > 0) return resolved;

    const trimmed = resolved.trim();
    if (!trimmed) return resolved;

    const numericValue = Number(trimmed);
    if (!Number.isNaN(numericValue)) return String(numericValue);

    try {
      const safeEval = (Roll as unknown as { safeEval?: (formula: string) => number }).safeEval;
      if (!safeEval) return resolved;
      const evaluated = safeEval(trimmed);
      return Number.isNaN(evaluated) ? resolved : String(evaluated);
    } catch {
      return resolved;
    }
  }
}

export { FormulaData };
export type { FormulaDataSource };
