import type { FormulaFieldData } from '@helpers/formulae/types.mjs';

/**
 * Flat identifiable system data matching {@link IdentifiableSchemaMixin}.
 * All fields are at the root level — no nested `unidentifiedInfo`.
 * Note: unidentifiedDescription and unidentifiedPrice are now stored in
 * flags.dnd35e.unidentifiedOverrides instead of schema fields.
 */
interface IdentifiableDocumentSystemSource {
  isIdentifiable: boolean;
  isIdentified: boolean;
  derivedUnidentifiedName: string;
  unidentifiedNameFormula: FormulaFieldData | null;
}

type IdentifiableDocumentSystemData = IdentifiableDocumentSystemSource;

export type {
  IdentifiableDocumentSystemData,
  IdentifiableDocumentSystemSource,
};
