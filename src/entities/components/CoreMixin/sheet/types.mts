import type { FormulaDataSource } from '@helpers/formulae/FormulaData.mjs';

/**
 * Serialized document POJO passed to formula registration evaluate callbacks.
 * This is the shape produced by `document.toObject()` merged with pending updates,
 * NOT a live Foundry document instance.
 */
type EvaluationDocument = {
  name: string;
  /** Foundry document type (e.g. 'Item', 'Actor'). Preserved from the live document so schema lookups work on POJOs. */
  documentName: string;
  type: string;
  system: {
    derivedName: string;
    nameFormula: FormulaDataSource;
    [key: string]: unknown;
  };
  isIdentified?: boolean;
  isIdentifiable?: boolean;
  [key: string]: unknown;
}

type FormulaRegistration = {
  impactedField: string;
  formulaField: string;
  /**
   * @param document  The self POJO (toObject + merged updates)
   * @param contexts  Additional named context POJOs (e.g. { Owner: actorPojo, Item: itemPojo })
   */
  evaluate: (document: EvaluationDocument, contexts: Record<string, EvaluationDocument>) => unknown;
}

export type {
  EvaluationDocument,
  FormulaRegistration,
};
