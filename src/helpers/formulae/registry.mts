/**
 * Familiar Schema Registry
 *
 * Maintains a global registry mapping document types and subtypes to their
 * static familiar schema builders. Used at resolution time to look up the
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

import type { AspectGroup, FamiliarSchema, FormulaFieldData } from './types.mjs';

/** Union of all Foundry document classes that can serve as familiar context. */
export type NonNullDocumentContext = ItemDnd35e | ActorDnd35e | DnD35eActiveEffect;
export type DocumentContext = NonNullDocumentContext | null;

export type ContextDocumentType = ItemType | EffectType | ActorType;

/**
 * Two-level registry: documentType → subtype → schema builder.
 * e.g. 'Item' → 'weapon' → buildWeaponFamiliar
 *
 * Builders accept an optional live Foundry document and resolve
 * property values from it when provided.
 */
const familiarSchemaRegistry = new Map<
  foundry.CONST.DocumentType,
  Map<ContextDocumentType, (context?: DocumentContext) => AspectGroup>
>();

/**
 * Register a familiar schema builder for a given document type and subtype.
 * Call this once per entity type, typically during system initialization.
 *
 * @param documentType The Foundry document type — 'Item', 'ActiveEffect', or 'Actor'
 * @param subtype The entity subtype — e.g. 'weapon', 'material', 'npc'
 * @param builder A function that returns the AspectGroup schema
 */
function registerFamiliarSchema(
  documentType: foundry.CONST.DocumentType,
  subtype: ContextDocumentType,
  builder: (context?: DocumentContext) => AspectGroup
): void {
  let subtypeMap = familiarSchemaRegistry.get(documentType);
  if (!subtypeMap) {
    subtypeMap = new Map();
    familiarSchemaRegistry.set(documentType, subtypeMap);
  }
  subtypeMap.set(subtype, builder);
}

/**
 * Check whether a familiar schema is registered for the given document type and subtype.
 */
function hasFamiliarSchema(documentType: foundry.CONST.DocumentType, subtype: ContextDocumentType): boolean {
  return familiarSchemaRegistry.get(documentType)?.has(subtype) ?? false;
}

/**
 * Retrieve the schema builder for a given document type and subtype.
 */
function getFamiliarBuilder(documentType: foundry.CONST.DocumentType, subtype: ContextDocumentType): ((context?: DocumentContext) => AspectGroup) | undefined {
  return familiarSchemaRegistry.get(documentType)?.get(subtype);
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
 * Build a FamiliarSchema from a FormulaFieldData's contexts map.
 * Context values are compound keys like "Item.weapon"; decodes and looks up the registry.
 *
 * When `documentMap` is provided, the matching live document is
 * forwarded to each builder so property values are populated inline.
 */
function buildContextFromFormula(
  formulaData: FormulaFieldData,
  documentMap?: Record<string, DocumentContext>
): FamiliarSchema {
  const ctx: FamiliarSchema = {};
  for (const [contextName, schemaType] of Object.entries(formulaData.contexts)) {
    const { documentType, subtype } = decodeContextType(schemaType);
    const builder = getFamiliarBuilder(documentType, subtype);
    const doc = documentMap?.[contextName];
    ctx[contextName] = {
      properties: builder ? builder(doc) : {},
    };
  }
  return ctx;
}

/**
 * Build a FamiliarSchema from a live document by auto-deriving contexts.
 *
 * Every document gets a `self` context. Parent contexts are named by their
 * document type to be more meaningful than a generic "parent":
 *
 * - Item → parent actor is **Owner** (alias: Parent)
 * - ActiveEffect → parent item/actor is **Item** or **Actor** (alias: Parent)
 *
 * @param document A live Foundry document with .documentName and .type
 * @returns FamiliarSchema with self (and optionally parent) contexts
 */
function buildDocumentFamiliar(document: DocumentContext): FamiliarSchema {
  const schema: FamiliarSchema = {};
  if (!document) return schema;

  // --- Self: always present if registered ---
  const docType = document.documentName;
  const subtype = document.type as ContextDocumentType;
  if (hasFamiliarSchema(docType, subtype)) {
    schema.self = {
      properties: getFamiliarBuilder(docType, subtype)!(document),
    };
  }

  // --- Parent: named by document type for clarity ---
  const parent = (document as any)?.parent as DocumentContext | undefined;
  if (parent) {
    const pDocType = parent.documentName;
    const pSubtype = parent.type as ContextDocumentType;
    if (hasFamiliarSchema(pDocType, pSubtype)) {
      const properties = getFamiliarBuilder(pDocType, pSubtype)!(parent);
      // Use the parent's document type as the context name (e.g. "Owner", "Item")
      // with "Parent" always available as an alias.
      const contextName = pDocType === 'Actor' ? 'Owner' : pDocType;
      schema[contextName] = {
        properties,
        aliases: ['Parent'],
      };
    }
  }

  return schema;
}

export {
  buildContextFromFormula,
  buildDocumentFamiliar,
  familiarSchemaRegistry,
  registerFamiliarSchema,
};
