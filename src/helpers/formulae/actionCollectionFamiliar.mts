/**
 * Action Collection Contexts helper.
 *
 * Injects an `actions` array-typed `FieldAspect` (accessPath `'system.actions'`) onto a
 * weapon Item's or actor's familiar schema, replacing the raw schema-walked
 * `system.actions` field (opted out via `familiar: { formulaVisible: false }` on the
 * schema field itself — see `WeaponSystemModel.mts`/`CreatureSystemModel.mts`).
 *
 * Unlike `itemCollectionFamiliar.mts`'s `items`/`weapons`/`equipment` (heterogeneous
 * real Foundry Item documents, dispatched per-element via the documentType/subtype
 * registry), the weapon side of this collection holds embedded (non-Document)
 * `ActionDataModel` instances with no `.documentName`/registry entry — each element's
 * own `.schema.fields` is walked directly at predicate-evaluation time
 * (`FormulaResolver.functionGrammar.mts`'s `evaluatePredicateForEmbeddedModelElement`),
 * so `weapon.system.actions` uses `arrayElement.kind: 'embeddedModel'`.
 *
 * `actor.system.actions` is a *different* shape: a `TypedObjectField` (Record<string,
 * stub>, keyed by action `_id`) holding only lightweight, uniform
 * `{ id, itemUuid, type, isSystem }` stubs — live-merged one entry at a time by each
 * owned action's own `ActionDataModel.createActionChange()`; the rich fields stay on
 * the source item. These stub values are plain schema-validated objects (from the
 * `TypedObjectField`'s inner `SchemaField`), NOT DataModel instances, so they have no
 * `.schema` property — `embeddedModel`'s per-element `.schema.fields` walk would build
 * an empty `#it` context for them and every predicate would silently evaluate false.
 * Since every stub shares the exact same uniform shape (unlike the weapon side, where
 * each subtype's real fields differ), the actor side instead uses
 * `arrayElement.kind: 'object'` with the stub's *cached* `elementFields` (passed in by
 * the caller, e.g. `CharacterSystemModel.schema.fields.actions.element.fields`) —
 * mirroring how `ArrayField(SchemaField)` fields like `senses`/`attacks` are classified
 * by the schema walker (`schemaWalker.mts`'s `inferArrayElementInfo`).
 *
 * Both shapes materialize to a searchable array at resolve time (Record values via
 * `Object.values()`, see `resolveFunctionBlock()`'s array-materialization step).
 *
 * @module
 */
import type { DocumentContext } from './familiarBuilderRegistry.mjs';
import type { AspectGroup, FieldAspect } from './types.mjs';

function localize(key: string, fallback: string): string {
  return (game as unknown as { i18n?: { localize?(k: string): string } }).i18n?.localize?.(key) ?? fallback;
}

/** Anything with a `system.actions` collection — either an Array (Weapon) or a Record (Actor). */
type ActionHolder = { system?: { actions?: unknown } };

function countActions(context: DocumentContext | undefined): number | undefined {
  const actions = (context as ActionHolder | null)?.system?.actions;
  if (!actions) return undefined;
  if (Array.isArray(actions)) return actions.length;
  if (typeof actions === 'object') return Object.values(actions).length;
  return undefined;
}

/**
 * Merge an `actions` collection aspect onto an existing AspectGroup. Call this from a
 * weapon's or actor's familiar schema builder alongside/instead of the auto-walked
 * `system.actions` schema field (opted out via `formulaVisible: false`).
 *
 * @param actorStubFields When set, classifies the aspect as `arrayElement.kind: 'object'`
 *   using this cached field shape instead of `'embeddedModel'` — pass the actor stub's
 *   inner `SchemaField.fields` (e.g. `CharacterSystemModel.schema.fields.actions.element.fields`).
 *   Omit for the weapon case, whose elements are real `ActionDataModel` instances with
 *   their own live `.schema`.
 */
export function withActionCollectionAspects(
  group: AspectGroup,
  context?: DocumentContext,
  actorStubFields?: Record<string, foundry.data.fields.DataField>
): AspectGroup {
  const aspect: FieldAspect = {
    display: localize('dnd35e.Formula.ActionCollections.actions', 'Actions'),
    type: 'array',
    accessPath: 'system.actions',
    arrayElement: actorStubFields
      ? { kind: 'object', elementFields: actorStubFields, elementAccessPath: 'actions.element', localizationPrefixes: [] }
      : { kind: 'embeddedModel' },
  };
  const count = countActions(context);
  if (count !== undefined) aspect.value = count;
  group.actions = aspect;
  return group;
}
