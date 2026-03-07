import { DocumentContext } from '@helpers/formulae/registry.mjs';
import type { IntellisenseObject } from '@helpers/formulae/types.mjs';

/**
 * Intellisense schema for Identifiable component (applyIdentifiableSchema) properties.
 * Only string/number properties are exposed — booleans are excluded from formulas.
 */
const applyIdentifiableIntellisense = (_schema: IntellisenseObject, _context?: DocumentContext): void => {
  // No string/number properties to expose from Identifiable.
  // identified and isIdentifiable are booleans — not useful in name formulas.
};

export { applyIdentifiableIntellisense };
