/**
 * Action Collection Contexts helper.
 *
 * Injects an `actions` array-typed `FieldAspect` (accessPath `'system.actions'`,
 * `arrayElement.kind: 'embeddedModel'`) onto a weapon Item's or actor's familiar
 * schema, replacing the raw schema-walked `system.actions` field (opted out via
 * `familiar: { formulaVisible: false }` on the schema field itself — see
 * `WeaponSystemModel.mts`/`CreatureSystemModel.mts`).
 *
 * Unlike `itemCollectionFamiliar.mts`'s `items`/`weapons`/`equipment` (heterogeneous
 * real Foundry Item documents, dispatched per-element via the documentType/subtype
 * registry), action collection elements are embedded (non-Document) DataModels with
 * no `.documentName`/registry entry — each element's own `.schema.fields` is walked
 * directly at predicate-evaluation time (`FormulaResolver.functionGrammar.mts`'s
 * `evaluatePredicateForEmbeddedModelElement`).
 *
 * `weapon.system.actions` is a genuine `ArrayField` of full `ActionDataModel`
 * instances. `actor.system.actions` is a `TypedObjectField` (Record<string, stub>,
 * keyed by action `_id`) holding only lightweight `{ id, itemUuid, type, isSystem }`
 * stubs — live-merged one entry at a time by each owned action's own
 * `ActionDataModel.createActionChange()`; the rich fields stay on the source item.
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
 */
export function withActionCollectionAspects(group: AspectGroup, context?: DocumentContext): AspectGroup {
  const aspect: FieldAspect = {
    display: localize('dnd35e.Formula.ActionCollections.actions', 'Actions'),
    type: 'array',
    accessPath: 'system.actions',
    arrayElement: { kind: 'embeddedModel' },
  };
  const count = countActions(context);
  if (count !== undefined) aspect.value = count;
  group.actions = aspect;
  return group;
}
