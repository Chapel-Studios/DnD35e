import { withActionCollectionAspects } from '@helpers/formulae/actionCollectionFamiliar.mjs';
import { FormulaResolver } from '@helpers/formulae/FormulaResolver.mjs';
import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
import { describe, expect, it } from 'vitest';

/**
 * `#self.actions`/`#weapon.actions`/`#actor.actions` — searchable action collection.
 *
 * Unlike `#self.items` (real Item documents, dispatched per-element via the
 * documentType/subtype registry), the weapon side holds embedded (non-Document)
 * `ActionDataModel` instances — walked per-element via their own live `.schema.fields`
 * (`arrayElement.kind: 'embeddedModel'`).
 *
 * `actor.system.actions` is a *different* shape: a `TypedObjectField` (Record<id, stub>)
 * of plain, schema-validated `{ id, itemUuid, type, isSystem }` stubs with no `.schema`
 * of their own — these are classified as `arrayElement.kind: 'object'` using the stub's
 * cached `elementFields` instead (see `actionCollectionFamiliar.mts`). Both shapes
 * materialize to a searchable array at resolve time (Record values via `Object.values()`).
 */
const { resolveFormula } = FormulaResolver;
const { NumberField, StringField, BooleanField } = foundry.data.fields;

const makeFakeAttack = (name: string, type: string, reachLength: number) => ({
  schema: {
    fields: {
      type: new (StringField as any)({}),
      reachLength: new (NumberField as any)({}),
    },
  },
  type,
  reachLength,
  name: { resolvedValue: name },
});

/**
 * A realistic actor-side action stub — a plain object with NO `.schema` property
 * (unlike `makeFakeAttack`'s weapon-side fixtures). Mirrors
 * `CreatureSystemModel.mts`'s `TypedObjectField(SchemaField({ id, itemUuid, type, isSystem }))`
 * element shape exactly, with no test-only `.schema` decoration.
 */
const makeActionStub = (id: string, type: string) => ({ id, itemUuid: `Item.${id}`, type, isSystem: true });

/** Cached field shape mirroring `CreatureSystemModel.mts`'s actor `actions` stub. */
const actionStubFields: Record<string, foundry.data.fields.DataField> = {
  id: new (StringField as any)({ required: true, blank: false }),
  itemUuid: new (StringField as any)({ required: true, blank: false }),
  type: new (StringField as any)({ required: true, blank: false }),
  isSystem: new (BooleanField as any)({ required: true, initial: true }),
};

describe('withActionCollectionAspects', () => {
  it('adds an actions array FieldAspect with kind embeddedModel for the weapon (no stub fields given)', () => {
    const group = withActionCollectionAspects({});
    expect(group.actions).toMatchObject({ type: 'array', accessPath: 'system.actions' });
    expect((group.actions as { arrayElement?: { kind?: string } }).arrayElement?.kind).toBe('embeddedModel');
  });

  it('adds an actions array FieldAspect with kind object for the actor (stub fields given)', () => {
    const group = withActionCollectionAspects({}, undefined, actionStubFields);
    expect(group.actions).toMatchObject({ type: 'array', accessPath: 'system.actions' });
    const arrayElement = (group.actions as { arrayElement?: { kind?: string; elementFields?: unknown } }).arrayElement;
    expect(arrayElement?.kind).toBe('object');
    expect(arrayElement?.elementFields).toBe(actionStubFields);
  });

  it('counts a live ArrayField-shaped actions collection (weapon)', () => {
    const context = { system: { actions: [makeFakeAttack('A', 'melee_weapon_attack', 5), makeFakeAttack('B', 'ranged_weapon_attack', 0)] } };
    const group = withActionCollectionAspects({}, context as never);
    expect((group.actions as { value?: number }).value).toBe(2);
  });

  it('counts a live TypedObjectField-shaped (Record) actions collection (actor)', () => {
    const context = { system: { actions: { a1: makeActionStub('a1', 'melee_weapon_attack'), a2: makeActionStub('a2', 'melee_weapon_attack') } } };
    const group = withActionCollectionAspects({}, context as never, actionStubFields);
    expect((group.actions as { value?: number }).value).toBe(2);
  });
});

describe('$weapon.actions — embeddedModel predicate resolution + Record materialization', () => {
  const schema: FamiliarSchema = {
    weapon: { properties: withActionCollectionAspects({}) },
    actor: { properties: withActionCollectionAspects({}, undefined, actionStubFields) },
  };

  const weaponDocMap = {
    weapon: {
      system: {
        actions: [
          makeFakeAttack('Longsword Attack', 'melee_weapon_attack', 5),
          makeFakeAttack('Longbow Attack', 'ranged_weapon_attack', 0),
        ],
      },
    },
  };

  const actorDocMap = {
    actor: {
      system: {
        actions: {
          a1: makeActionStub('a1', 'melee_weapon_attack'),
          a2: makeActionStub('a2', 'ranged_weapon_attack'),
        },
      },
    },
  };

  it('$count(#weapon.actions) counts a real ArrayField collection', () => {
    expect(resolveFormula('$count(#weapon.actions)', schema, weaponDocMap as never)).toBe('2');
  });

  it('$count(#actor.actions) counts a TypedObjectField (Record) collection via Object.values()', () => {
    expect(resolveFormula('$count(#actor.actions)', schema, actorDocMap as never)).toBe('2');
  });

  it('$any(...) filters by the action\'s own `type` field', () => {
    expect(resolveFormula('$any(#weapon.actions, #it.type == \'melee_weapon_attack\')', schema, weaponDocMap as never)).toBe('true');
    expect(resolveFormula('$any(#weapon.actions, #it.type == \'spell\')', schema, weaponDocMap as never)).toBe('false');
  });

  it('$count(...) with a predicate matching only one action type', () => {
    expect(resolveFormula('$count(#weapon.actions, #it.type == \'melee_weapon_attack\')', schema, weaponDocMap as never)).toBe('1');
  });

  // Regression guard: actor stubs are plain objects with NO `.schema` of their own
  // (unlike the fake weapon-side fixtures above). Before the `object`-kind fix, this
  // predicate always evaluated false because `evaluatePredicateForEmbeddedModelElement`
  // silently built an empty `#it` context for elements lacking `.schema.fields`.
  it('$any(...) filters real (schema-less) actor stub elements by their own `type` field', () => {
    expect(resolveFormula('$any(#actor.actions, #it.type == \'melee_weapon_attack\')', schema, actorDocMap as never)).toBe('true');
    expect(resolveFormula('$any(#actor.actions, #it.type == \'spell\')', schema, actorDocMap as never)).toBe('false');
  });

  it('$count(...) with a predicate matching only one actor stub action type', () => {
    expect(resolveFormula('$count(#actor.actions, #it.type == \'ranged_weapon_attack\')', schema, actorDocMap as never)).toBe('1');
  });
});

describe('named-element access — #weapon.actions.\'Resolved Name\'.property', () => {
  const schema: FamiliarSchema = {
    weapon: { properties: withActionCollectionAspects({}) },
  };

  const docMap = {
    weapon: {
      system: {
        actions: [
          makeFakeAttack('Longsword Attack', 'melee_weapon_attack', 5),
          makeFakeAttack('LongbowAttack', 'ranged_weapon_attack', 0),
        ],
      },
    },
  };

  it('resolves a quoted custom path addressing one element by its resolved name', () => {
    expect(resolveFormula('#weapon.\'system.actions.Longsword Attack.reachLength\'', schema, docMap as never)).toBe('5');
  });

  it('resolves an unquoted path when the resolved name has no spaces', () => {
    expect(resolveFormula('#weapon.actions.LongbowAttack.reachLength', schema, docMap as never)).toBe('0');
  });

  it('leaves the token unresolved when no element matches the given name', () => {
    expect(resolveFormula('#weapon.actions.NoSuchAction.reachLength', schema, docMap as never)).toBe('#weapon.actions.NoSuchAction.reachLength');
  });
});
