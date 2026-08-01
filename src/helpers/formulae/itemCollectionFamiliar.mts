/**
 * poc §7.2c — Item Collection Contexts helper.
 *
 * Injects `items` / `weapons` / `equipment` array-typed `FieldAspect`s (accessPath
 * `'items'`, `arrayElement.kind: 'heterogeneous'`) onto any document-level familiar
 * schema that has a live `.items` `EmbeddedCollection` (actors and container items).
 * These aspects don't correspond to a schema field — they're injected after
 * `gatherAspectsFromSchema()` runs, the same way `DOCUMENT_LEVEL_ASPECTS` merges in
 * `name`/`img` outside `schemaWalker.mts`'s schema-field walk.
 *
 * Unlike a uniform `ArrayField(SchemaField)` array (`senses`, `attacks`), each
 * element's real fields depend on its own `.type` — resolved per-element at
 * predicate-evaluation time (`FormulaResolver.functionGrammar.mts`) via
 * `getFamiliarBuilder('Item', element.type)`, not one shared `elementFields` shape.
 *
 * @module
 */
import { EQUIPPABLE_ITEM_TYPES, weaponItemType } from '@items/itemTypes.mjs';

import type { DocumentContext } from './familiarBuilderRegistry.mjs';
import type { AspectGroup, FieldAspect } from './types.mjs';

/** Anything with a live `.items` `EmbeddedCollection` (actors, container items). */
type ItemHolder = { items?: Iterable<{ type: string }> };

function countItems(context: DocumentContext | undefined, filterTypes?: string[]): number | undefined {
  const items = (context as ItemHolder | null)?.items;
  if (!items) return undefined;
  const arr = [...items];
  return filterTypes ? arr.filter(item => filterTypes.includes(item.type)).length : arr.length;
}

function localize(key: string, fallback: string): string {
  return (game as unknown as { i18n?: { localize?(k: string): string } }).i18n?.localize?.(key) ?? fallback;
}

function buildItemCollectionAspect(
  displayKey: string,
  fallback: string,
  filterTypes: string[] | undefined,
  context?: DocumentContext
): FieldAspect {
  const aspect: FieldAspect = {
    display: localize(displayKey, fallback),
    type: 'array',
    accessPath: 'items',
    arrayElement: {
      kind: 'heterogeneous',
      documentType: 'Item',
      ...(filterTypes ? { filterTypes } : {}),
    },
  };
  const count = countItems(context, filterTypes);
  if (count !== undefined) aspect.value = count;
  return aspect;
}

/**
 * Merge `items`/`weapons`/`equipment` collection aspects onto an existing AspectGroup.
 * Only meaningful for documents with a live/schema-relevant `.items` collection —
 * call this from an Actor or Container familiar schema builder, not from a
 * non-container Item's builder.
 */
export function withItemCollectionAspects(group: AspectGroup, context?: DocumentContext): AspectGroup {
  group.items = buildItemCollectionAspect('dnd35e.Formula.ItemCollections.items', 'Items', undefined, context);
  group.weapons = buildItemCollectionAspect('dnd35e.Formula.ItemCollections.weapons', 'Weapons', [weaponItemType], context);
  group.equipment = buildItemCollectionAspect('dnd35e.Formula.ItemCollections.equipment', 'Equipment', [...EQUIPPABLE_ITEM_TYPES], context);
  return group;
}
