/**
 * Familiar Builder Registry — leaf module (poc §7.2c).
 *
 * Holds the documentType → subtype → schema-builder Map plus its accessors,
 * extracted out of `registry.mts` into a dependency-free leaf module so that
 * `FormulaResolver.functionGrammar.mts` (used by poc §7.2c's `#self.items`
 * heterogeneous per-element resolution) can call `getFamiliarBuilder()`
 * directly without creating a runtime import cycle:
 *
 *   registry.mts → FormulaResolver.mjs → functionGrammar.mts
 *
 * `registry.mts` re-exports everything here for backward compatibility —
 * existing consumers importing from `registry.mjs`/`index.mjs` are unaffected.
 *
 * @module
 */
import type { ActorType } from '@actors/actorTypes.mjs';
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { ActiveEffectDnd35e } from '@effects/baseActiveEffect/index.mjs';
import type { EffectType } from '@effects/effectTypes.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import type { ItemType } from '@items/itemTypes.mjs';

import type { AspectGroup } from './types.mjs';

/** Union of all Foundry document classes that can serve as familiar context. */
export type NonNullDocumentContext = ItemDnd35e | ActorDnd35e | ActiveEffectDnd35e;
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
 * List every subtype currently registered for a given document type
 * (e.g. every registered Item subtype, for `#self.items`'s autocomplete union — poc §7.2c).
 */
function getRegisteredSubtypes(documentType: foundry.CONST.DocumentType): ContextDocumentType[] {
  return [...(familiarSchemaRegistry.get(documentType)?.keys() ?? [])];
}

export {
  familiarSchemaRegistry,
  getFamiliarBuilder,
  getRegisteredSubtypes,
  hasFamiliarSchema,
  registerFamiliarSchema,
};
