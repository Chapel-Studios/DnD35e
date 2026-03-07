import { DocumentContext } from '@helpers/formulae/registry.mjs';
import type { IntellisenseObject } from '@helpers/formulae/types.mjs';
import { intellisenseProp } from '@helpers/formulae/utils.mjs';
import { applyPhysicalIntellisense } from '@items/components/Physical/data/physicalIntellisense.mjs';

/**
 * Intellisense schema for Equippable component (applyEquippableSchema) properties.
 * Mirrors the composability: calls applyPhysicalIntellisense first.
 */
const applyEquippableIntellisense = (schema: IntellisenseObject, context?: DocumentContext): void => {
  applyPhysicalIntellisense(schema, context);

  schema.designedForSize = intellisenseProp('Designed For Size', 'string', 'system.designedForSize', context);
};

export { applyEquippableIntellisense };
