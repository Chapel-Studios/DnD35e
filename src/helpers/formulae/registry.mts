/**
 * Intellisense Schema Registry
 *
 * Maintains a global registry mapping document types and subtypes to their
 * static intellisense schema builders. Used at resolution time to look up the
 * correct schema for each context referenced in a FormulaFieldData.
 *
 * Structure: documentType (Item / ActiveEffect / Actor) → subtype (weapon / material / npc) → builder
 */

import { ActorType } from '@actors/actorTypes.mjs';
import { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { DnD35eActiveEffect } from '@effects/BaseActiveEffect/index.mjs';
import { EffectType } from '@effects/effectTypes.mjs';
import { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import { ItemType } from '@items/itemTypes.mjs';

import type { FormulaFieldData, IntellisenseObject,IntellisenseSchema } from './types.mjs';

/** Union of all Foundry document classes that can serve as intellisense context. */
export type NonNullDocumentContext = ItemDnd35e | ActorDnd35e | DnD35eActiveEffect;
export type DocumentContext = NonNullDocumentContext | null;

export type ContextDocumentType = ItemType | EffectType | ActorType;

/**
 * Two-level registry: documentType → subtype → schema builder.
 * e.g. 'Item' → 'weapon' → buildWeaponIntellisense
 *
 * Builders accept an optional live Foundry document and resolve
 * property values from it when provided.
 */
const intellisenseSchemaRegistry = new Map<foundry.CONST.DocumentType, Map<ContextDocumentType, (context?: DocumentContext) => IntellisenseObject>>();

/**
 * Register an intellisense schema builder for a given document type and subtype.
 * Call this once per entity type, typically during system initialization.
 *
 * @param documentType The Foundry document type — 'Item', 'ActiveEffect', or 'Actor'
 * @param subtype The entity subtype — e.g. 'weapon', 'material', 'npc'
 * @param builder A function that returns the IntellisenseObject schema
 */
function registerIntellisenseSchema(
  documentType: foundry.CONST.DocumentType,
  subtype: ContextDocumentType,
  builder: (context?: DocumentContext) => IntellisenseObject
): void {
  let subtypeMap = intellisenseSchemaRegistry.get(documentType);
  if (!subtypeMap) {
    subtypeMap = new Map();
    intellisenseSchemaRegistry.set(documentType, subtypeMap);
  }
  subtypeMap.set(subtype, builder);
}

/**
 * Check whether an intellisense schema is registered for the given document type and subtype.
 */
function hasIntellisenseSchema(documentType: foundry.CONST.DocumentType, subtype: ContextDocumentType): boolean {
  return intellisenseSchemaRegistry.get(documentType)?.has(subtype) ?? false;
}

/**
 * Retrieve the schema builder for a given document type and subtype.
 */
function getIntellisenseBuilder(documentType: foundry.CONST.DocumentType, subtype: ContextDocumentType): ((context?: DocumentContext) => IntellisenseObject) | undefined {
  return intellisenseSchemaRegistry.get(documentType)?.get(subtype);
}

/**
 * Encode a document type and subtype into the compound key stored in FormulaFieldData.contexts.
 * Format: "DocumentType.subtype" — e.g. "Item.weapon"
 */
function encodeContextType(documentType: foundry.CONST.DocumentType, subtype: ContextDocumentType): string {
  return `${documentType}.${subtype}`;
}

/**
 * Decode a compound context type string back into document type and subtype.
 */
function decodeContextType(contextType: string): { documentType: foundry.CONST.DocumentType; subtype: ContextDocumentType } {
  const dotIndex = contextType.indexOf('.');
  if (dotIndex === -1) return { documentType: '' as foundry.CONST.DocumentType, subtype: contextType as ContextDocumentType };
  return {
    documentType: contextType.substring(0, dotIndex) as foundry.CONST.DocumentType,
    subtype: contextType.substring(dotIndex + 1) as ContextDocumentType,
  };
}

/**
 * Build an IntellisenseContext from a FormulaFieldData's contexts map.
 * Context values are compound keys like "Item.weapon"; decodes and looks up the registry.
 *
 * When `documentMap` is provided, the matching live document is
 * forwarded to each builder so property values are populated inline.
 */
function buildContextFromFormula(
  formulaData: FormulaFieldData,
  documentMap?: Record<string, DocumentContext>
): IntellisenseSchema {
  const ctx: IntellisenseSchema = {};
  for (const [contextName, schemaType] of Object.entries(formulaData.contexts)) {
    const { documentType, subtype } = decodeContextType(schemaType);
    const builder = getIntellisenseBuilder(documentType, subtype);
    const doc = documentMap?.[contextName];
    ctx[contextName] = {
      properties: builder ? builder(doc) : {},
    };
  }
  return ctx;
}

export {
  buildContextFromFormula,
  decodeContextType,
  encodeContextType,
  getIntellisenseBuilder,
  hasIntellisenseSchema,
  intellisenseSchemaRegistry,
  registerIntellisenseSchema,
};
