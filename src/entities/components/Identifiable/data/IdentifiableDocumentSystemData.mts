import type { FormulaFieldData } from '@helpers/formulae/types.mjs';

/**
 * Flat identifiable system data matching {@link IdentifiableSchemaMixin}.
 * All fields are at the root level — no nested `unidentifiedInfo`.
 */
interface IdentifiableDocumentSystemSource {
  isIdentified: boolean;
  unidentifiedDescription?: string;
  unidentifiedPrice: number | null;
  derivedUnidentifiedName: string;
  unidentifiedNameFormula: FormulaFieldData | null;
}

type IdentifiableDocumentSystemData = IdentifiableDocumentSystemSource;

export type {
  IdentifiableDocumentSystemData,
  IdentifiableDocumentSystemSource,
};
