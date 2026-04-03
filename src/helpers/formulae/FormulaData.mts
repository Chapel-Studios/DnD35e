/**
 * FormulaData — DataModel for formula fields.
 *
 * Stores a formula string, its resolved value, an optional unidentified variant,
 * and resolution metadata (expectedType, contextBindings).
 *
 * Live instance methods: resolve(), resolveUnidentified(), buildFamiliarSchema(),
 * getEffective(), getEffectiveFormula().
 *
 * @module
 */

import type { DocumentContext } from './registry.mjs';
import { buildContextFromFormula } from './registry.mjs';
import type { EditorViewMode, FamiliarSchema, FormulaContextBinding } from './types.mjs';
import { UNIDENTIFIED } from './types.mjs';
import { resolveFormula } from './utils.mjs';

const {
  ObjectField,
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
  contextBindings: Record<string, FormulaContextBinding>;
}

class FormulaData extends foundry.abstract.DataModel {
  // Declare model properties for TypeScript
  declare formula: string;
  declare resolvedValue: string | null;
  declare unidentifiedFormula: string | null;
  declare unidentifiedResolvedValue: string | null;
  declare expectedType: 'string' | 'number';
  declare contextBindings: Record<string, FormulaContextBinding>;

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
      contextBindings: new ObjectField({ initial: {} }),
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

    // Build familiar context from stored contextBindings (legacy: contexts)
    const familiarSchema = buildContextFromFormula({
      formula: this.formula,
      contexts: this._contextsFromBindings(),
    });

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

    const familiarSchema = buildContextFromFormula({
      formula: this.unidentifiedFormula,
      contexts: this._contextsFromBindings(),
    });

    return resolveFormula(this.unidentifiedFormula, familiarSchema, documentDataMap);
  }

  // ---------------------------------------------------------------------------
  // Familiar
  // ---------------------------------------------------------------------------

  /**
   * Build the full FamiliarSchema for formula autocomplete based on context bindings.
   */
  buildFamiliarSchema(): FamiliarSchema {
    return buildContextFromFormula({
      formula: this.formula,
      contexts: this._contextsFromBindings(),
    });
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
    const contexts = FormulaData._contextsFromSource(source);
    const familiarSchema = buildContextFromFormula({ formula: source.formula, contexts });
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
    const contexts = FormulaData._contextsFromSource(source);
    const familiarSchema = buildContextFromFormula({ formula: source.unidentifiedFormula, contexts });
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
      contextBindings: opts.contextBindings ?? {},
    };
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /**
   * Convert contextBindings to the legacy contexts map.
   * Static version that operates on a raw source object.
   * @internal
   */
  private static _contextsFromSource(source: FormulaDataSource): Record<string, string> {
    const bindings = source.contextBindings;
    if (!bindings || typeof bindings !== 'object') return {};

    const contexts: Record<string, string> = {};
    for (const [name, binding] of Object.entries(bindings)) {
      if (binding?.documentType && binding?.expectedSubtypes?.length) {
        contexts[name] = `${binding.documentType}.${binding.expectedSubtypes[0]}`;
      }
    }
    return contexts;
  }

  /**
   * Convert contextBindings (new format) to the legacy contexts map
   * expected by buildContextFromFormula().
   *
   * contextBindings: { owner: { documentType: 'Actor', ... } }
   * → contexts: { owner: 'Actor.character' } (first expectedSubtype)
   *
   * @internal
   */
  private _contextsFromBindings(): Record<string, string> {
    return FormulaData._contextsFromSource(this as unknown as FormulaDataSource);
  }
}

export { FormulaData };
export type { FormulaDataSource };
