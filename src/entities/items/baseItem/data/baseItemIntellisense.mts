import { createDocumentIntellisense } from '@ec/CoreMixin/data/coreMixinIntellisense.mjs';
import { DocumentContext } from '@helpers/formulae/registry.mjs';
import type { IntellisenseObject } from '@helpers/formulae/types.mjs';

/**
 * Intellisense schema base for Items.
 * Applies CoreMixin first, then adds item-level fields.
 */
const createBaseItemIntellisense = (context?: DocumentContext): IntellisenseObject => {
  // Document-level 'name' field
  const schema = createDocumentIntellisense(context);


  return schema;
};

export { createBaseItemIntellisense };
