import { DocumentContext } from '@helpers/formulae/index.mjs';
import type { IntellisenseObject } from '@helpers/formulae/types.mjs';
import { intellisenseProp } from '@helpers/formulae/utils.mjs';

/**
 * Factory for document-level intellisense fields (outside system.*).
 * When `context` is provided, property values are resolved from the data.
 */
const createDocumentIntellisense = (context?: DocumentContext): IntellisenseObject => ({
  name: intellisenseProp('Name', 'string', 'name', context),
});

export { createDocumentIntellisense };
  