/**
 * FormulaData — DataModel for formula fields.
 *
 * Stores a formula string, its resolved value, an optional unidentified variant,
 * and resolution metadata (expectedType).
 *
 * Live instance methods: resolve(), resolveUnidentified(),
 * getEffective(), getEffectiveFormula().
 *
 * @module
 */

import type { DocumentContext } from './registry.mjs';
import { buildDocumentFamiliar } from './registry.mjs';
import type { EditorViewMode, FamiliarSchema } from './types.mjs';
import { UNIDENTIFIED } from './types.mjs';
import { resolveFormula } from './utils.mjs';

const {
  StringField,
} = foundry.data.fields;

/**
 * Source shape written to the database for a FormulaData field.
 */
interface FormulaDataSource {
  formula: string;
  resolvedValue: string | null;
  unidentifiedFormula: string | null;
  unidentifiedResolvedValue: string | null;
  expectedType: 'string' | 'number';
}

class FormulaData extends foundry.abstract.DataModel {
  // Declare model properties for TypeScript
  declare formula: string;
  declare resolvedValue: string | null;
  declare unidentifiedFormula: string | null;
  declare unidentifiedResolvedValue: string | null;
  declare expectedType: 'string' | 'number';

  static override defineSchema() {
    return {
      // Identified formula
      formula: new StringField({ blank: true, initial: '' }),
      resolvedValue: new StringField({ nullable: true, initial: null }),

      // Unidentified formula
      unidentifiedFormula: new StringField({ nullable: true, initial: null }),
      unidentifiedResolvedValue: new StringField({ nullable: true, initial: null }),

      // Resolution config
      expectedType: new StringField({ choices: ['string', 'number'], initial: 'string' }),
    };
  }

  // ---------------------------------------------------------------------------
  // View-mode helpers
  // ---------------------------------------------------------------------------

  /**
   * Get the effective formula for a given view mode.
   * Returns unidentifiedFormula when viewing unidentified (if set), otherwise formula.
   */
  getEffectiveFormula(viewMode: EditorViewMode): string {
    if (viewMode === UNIDENTIFIED && this.unidentifiedFormula != null) {
      return this.unidentifiedFormula;
    }
    return this.formula;
  }

  /**
   * Get the effective resolved value for a given view mode.
   * Returns unidentifiedResolvedValue when viewing unidentified (if set), otherwise resolvedValue.
   */
  getEffective(viewMode: EditorViewMode): string | null {
    if (viewMode === UNIDENTIFIED && this.unidentifiedResolvedValue != null) {
      return this.unidentifiedResolvedValue;
    }
    return this.resolvedValue;
  }

  // ---------------------------------------------------------------------------
  // Resolution
  // ---------------------------------------------------------------------------

  /**
   * Resolve the identified formula using a document data map.
   * Delegates to the existing resolveFormula() utility.
   *
   * @param documentDataMap Map of context names → live documents/objects
   * @param fallback Fallback value if formula is empty
   * @returns Resolved string, or fallback if no formula
   */
  resolve(documentDataMap: Record<string, DocumentContext>, fallback: string = ''): string {
    if (!this.formula) return fallback;
    const familiarSchema = FormulaData._buildFamiliarFromDocumentMap(documentDataMap);
    return resolveFormula(this.formula, familiarSchema, documentDataMap);
  }

  /**
   * Resolve the unidentified formula using a document data map.
   *
   * @param documentDataMap Map of context names → live documents/objects
   * @param fallback Fallback value if unidentified formula is empty
   * @returns Resolved string, or fallback if no unidentified formula
   */
  resolveUnidentified(documentDataMap: Record<string, DocumentContext>, fallback: string = ''): string {
    if (!this.unidentifiedFormula) return fallback;
    const familiarSchema = FormulaData._buildFamiliarFromDocumentMap(documentDataMap);
    return resolveFormula(this.unidentifiedFormula, familiarSchema, documentDataMap);
  }

  // ---------------------------------------------------------------------------
  // Static source-level resolution (for POJOs, avoids DataModel construction)
  // ---------------------------------------------------------------------------

  /**
   * Resolve the identified formula from a raw FormulaDataSource POJO.
   * Use when you have serialized data (e.g. from toObject()) rather than a live DataModel.
   */
  static resolveSource(
    source: FormulaDataSource,
    documentDataMap: Record<string, unknown>,
    fallback: string = ''
  ): string {
    if (!source.formula) return fallback;
    const familiarSchema = FormulaData._buildFamiliarFromDocumentMap(documentDataMap as Record<string, DocumentContext>);
    return resolveFormula(source.formula, familiarSchema, documentDataMap as Record<string, DocumentContext>);
  }

  /**
   * Resolve the unidentified formula from a raw FormulaDataSource POJO.
   * Use when you have serialized data (e.g. from toObject()) rather than a live DataModel.
   */
  static resolveUnidentifiedSource(
    source: FormulaDataSource,
    documentDataMap: Record<string, unknown>,
    fallback: string = ''
  ): string {
    if (!source.unidentifiedFormula) return fallback;
    const familiarSchema = FormulaData._buildFamiliarFromDocumentMap(documentDataMap as Record<string, DocumentContext>);
    return resolveFormula(source.unidentifiedFormula, familiarSchema, documentDataMap as Record<string, DocumentContext>);
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
      unidentifiedFormula: opts.unidentifiedFormula ?? null,
      unidentifiedResolvedValue: opts.unidentifiedResolvedValue ?? null,
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
   * @internal
   */
  private static _buildFamiliarFromDocumentMap(documentDataMap: Record<string, DocumentContext>): FamiliarSchema {
    const schema: FamiliarSchema = {};
    for (const [contextName, doc] of Object.entries(documentDataMap)) {
      if (!doc) continue;
      const docSchema = buildDocumentFamiliar(doc);
      // buildDocumentFamiliar returns { self: ..., Owner: ... } keyed by role.
      // Map the "self" entry to the actual context name from the data map.
      if (docSchema.self) {
        schema[contextName] = docSchema.self;
      }
    }
    return schema;
  }
}

export { FormulaData };
export type { FormulaDataSource };
