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
 * Recursively gather FormulaContextDeclarations from all FormulaField instances
 * in a schema's field tree.
 */
function gatherFieldContextDeclarations(fields: Record<string, any>): { contextName: string; resolvePath?: string; documentType: string; fallbackSubtypes: string[]; aliases?: string[] }[] {
  const results: { contextName: string; resolvePath?: string; documentType: string; fallbackSubtypes: string[]; aliases?: string[] }[] = [];
  for (const field of Object.values(fields)) {
    const contexts = field?.formulaContexts ?? field?.options?.contexts;
    if (Array.isArray(contexts)) {
      results.push(...contexts);
    }
    // Recurse into SchemaField children
    if (field?.fields) {
      results.push(...gatherFieldContextDeclarations(field.fields));
    }
  }
  return results;
}

/**
 * Build a FamiliarSchema from a live document by gathering context
 * declarations from all FormulaField instances in its schema.
 *
 * Every document gets a `self` context. Additional contexts are derived
 * from the union of all FormulaField `contexts` declarations across the
 * entire schema (for document-level autocomplete).
 *
 * When no live parent is available (e.g. building schema for autocomplete
 * on a detached item), `fallbackSubtypes` from the declaration are used
 * to build a schema-only context.
 *
 * @param document A live Foundry document with .documentName and .type
 * @returns FamiliarSchema with self (and optionally declared) contexts
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

  // --- Additional contexts: union of all FormulaField declarations ---
  const systemSchema = (document as any).system?.schema;
  if (systemSchema?.fields) {
    const allDeclarations = gatherFieldContextDeclarations(systemSchema.fields);
    // Deduplicate by contextName (first declaration wins)
    const seen = new Set<string>();
    for (const decl of allDeclarations) {
      if (seen.has(decl.contextName)) continue;
      seen.add(decl.contextName);

      // Try to resolve the live context document via the declared path
      let contextDoc: DocumentContext | undefined;
      if (decl.resolvePath) {
        let current: any = document;
        for (const segment of decl.resolvePath.split('.')) {
          if (!current) break;
          current = current[segment];
        }
        if (current?.documentName) {
          contextDoc = current as DocumentContext;
        }
      }

      if (contextDoc) {
        // Live parent available — use its actual type for schema
        const ctxDocType = contextDoc.documentName;
        const ctxSubtype = contextDoc.type as ContextDocumentType;
        if (hasFamiliarSchema(ctxDocType, ctxSubtype)) {
          schema[decl.contextName] = {
            properties: getFamiliarBuilder(ctxDocType, ctxSubtype)!(contextDoc),
            aliases: decl.aliases,
          };
        }
      } else if (decl.fallbackSubtypes?.length) {
        // No live parent: build a schema-only context from fallback subtypes
        const fallbackDocType = decl.documentType as foundry.CONST.DocumentType;
        for (const fallbackSubtype of decl.fallbackSubtypes) {
          if (hasFamiliarSchema(fallbackDocType, fallbackSubtype as ContextDocumentType)) {
            schema[decl.contextName] = {
              properties: getFamiliarBuilder(fallbackDocType, fallbackSubtype as ContextDocumentType)!(),
              aliases: decl.aliases,
            };
            break;
          }
        }
      }
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
