import { createDocumentIntellisense } from '@ec/CoreMixin/data/coreMixinIntellisense.mjs';
import type { DocumentContext } from '@helpers/formulae/registry.mjs';
import type { IntellisenseObject } from '@helpers/formulae/types.mjs';

/**
 * Minimal intellisense schema for actors.
 * Currently only exposes document-level 'name'.
 * Will grow as actor TypeDataModels are introduced.
 */
const buildBaseActorIntellisense = (context?: DocumentContext): IntellisenseObject => {
  const schema: IntellisenseObject = {};
  Object.assign(schema, createDocumentIntellisense(context));
  return schema;
};

export { buildBaseActorIntellisense };
