import { applyIdentifiableIntellisense } from '@ec/Identifiable/data/identifiableIntellisense.mjs';
import { DocumentContext } from '@helpers/formulae/registry.mjs';
import type { IntellisenseObject } from '@helpers/formulae/types.mjs';
import { intellisenseProp } from '@helpers/formulae/utils.mjs';

/**
 * Intellisense schema for Physical component (applyPhysicalSchema) properties.
 * Mirrors the composability: calls applyIdentifiableIntellisense first.
 */
const applyPhysicalIntellisense = (schema: IntellisenseObject, context?: DocumentContext): void => {
  applyIdentifiableIntellisense(schema, context);

  schema.hp = {
    value: intellisenseProp('HP', 'number', 'system.hp.value', context),
    max: intellisenseProp('Max HP', 'number', 'system.hp.max', context),
  };

  schema.hardness = intellisenseProp('Hardness', 'number', 'system.hardness', context);
  schema.quantity = intellisenseProp('Quantity', 'number', 'system.quantity', context);
  schema.weight = intellisenseProp('Weight', 'number', 'system.weight', context);
  schema.size = intellisenseProp('Size', 'string', 'system.size', context);
  schema.price = intellisenseProp('Price', 'number', 'system.price', context);
};

export { applyPhysicalIntellisense };
