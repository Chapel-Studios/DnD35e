import type { FormulaDataSource } from '@helpers/formulae/FormulaData.mjs';

/**
 * Serialized document POJO passed to formula registration evaluate callbacks.
 * This is the shape produced by `document.toObject()` merged with pending updates,
 * NOT a live Foundry document instance.
 */
type EvaluationDocument = {
  name: string;
  system: {
    derivedName: string;
    nameFormula: FormulaDataSource | null;
    isIdentified?: boolean;
    isIdentifiable?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

type FormulaRegistration = {
  impactedField: string;
  formulaField: string;
  evaluate: (document: EvaluationDocument) => unknown;
}

export type {
  EvaluationDocument,
  FormulaRegistration,
};
